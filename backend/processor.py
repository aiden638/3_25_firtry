import os
import math
import numpy as np
import cv2
import joblib
import io
import base64
from sklearn.cluster import KMeans
import requests
import json

try:
    from rembg import remove as rembg_remove, new_session
    HAS_REMBG = True
except ImportError:
    HAS_REMBG = False

class FlatfootProcessor:
    def __init__(self, model_path):
        self.model = joblib.load(model_path)
        self.RESIZE_MAX = 800
        self.PAD = 20
        self.SEED = 0

        # Constants from 11_23_last.py
        self.ROI_Y_MIN_FRAC = 0.60
        self.ROI_Y_MAX_FRAC = 0.90
        self.CURV_K = 5
        self.TOP_FRAC = 0.12
        self.MID_FRAC = 0.98
        self.N_SCAN = 5
        self.MIN_WIDTH_FRAC = 0.06
        self.UPPER_CAP_FRAC = 0.45

        # Initialize rembg session lazily if needed
        self.rembg_session = None
        self.use_external = os.environ.get("USE_EXTERNAL_API", "false").lower() == "true"
        
        if self.use_external:
            print(">>> [Processor] Configured to use External API (remove.bg)")
        elif HAS_REMBG:
            print(">>> [Processor] Configured to use Local rembg")
        else:
            print(">>> [Processor] Falling back to GrabCut (No external API, No rembg)")

    def process_image(self, image_bytes):
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return None, "이미지를 읽을 수 없습니다."

        # Resize like 11_23_last
        H, W = img.shape[:2]
        if max(H, W) > self.RESIZE_MAX:
            s = self.RESIZE_MAX / float(max(H, W))
            img = cv2.resize(img, (int(W*s), int(H*s)), interpolation=cv2.INTER_AREA)

        # MASK
        m_all = self.mask_from_alpha_or_rembg_or_grabcut(img)
        if m_all is None or np.count_nonzero(m_all) < 20:
            return None, "발을 감지할 수 없습니다."

        try:
            mL, mR = self.split_left_right_by_mask(m_all)
        except Exception as e:
            return None, f"좌우 발 분리 실패: {str(e)}"

        # PROCESS STRIPPED
        res_L = self._process_one_side(img, mL, "LEFT")
        res_R = self._process_one_side(img, mR, "RIGHT")

        if not res_L or not res_R:
             return None, "두 발 모두 정확히 인식되어야 합니다."

        # FEATURE GEN
        features = self._calculate_pipline_features(res_L, res_R)
        
        prob = self.model.predict_proba(features)[0][1] * 100

        # OVERLAY
        overlay = img.copy()
        
        M_global_L = res_L["M_global"]
        H_global_L = res_L["H_global"]
        p0_L = res_L["p0"]
        p1_L = res_L["p1"]
        cv2.line(overlay, M_global_L, H_global_L, (0,255,0), 3)
        cv2.circle(overlay, M_global_L, 6, (0,255,0), -1)
        cv2.circle(overlay, H_global_L, 6, (0,128,0), -1)
        cv2.line(overlay, p0_L, p1_L, (255,80,80), 3)

        M_global_R = res_R["M_global"]
        H_global_R = res_R["H_global"]
        p0_R = res_R["p0"]
        p1_R = res_R["p1"]
        cv2.line(overlay, M_global_R, H_global_R, (0,255,0), 3)
        cv2.circle(overlay, M_global_R, 6, (0,255,0), -1)
        cv2.circle(overlay, H_global_R, 6, (0,128,0), -1)
        cv2.line(overlay, p0_R, p1_R, (255,80,80), 3)

        _, buffer = cv2.imencode('.jpg', overlay)
        img_base64 = base64.b64encode(buffer).decode('utf-8')

        return {
            "prediction_percent": round(prob, 2),
            "annotated_image": img_base64,
            "left": {"angle": res_L["angle"]},
            "right": {"angle": res_R["angle"]}
        }, None

    def remove_small_components(self, mask, min_area):
        num, labels, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
        out = np.zeros_like(mask)
        for i in range(1, num):
            if stats[i, cv2.CC_STAT_AREA] >= min_area:
                out[labels == i] = 255
        return out

    def fill_holes(self, mask):
        h, w = mask.shape
        inv = cv2.bitwise_not(mask)
        flood = inv.copy()
        flood_mask = np.zeros((h+2, w+2), np.uint8)
        cv2.floodFill(flood, flood_mask, (0,0), 255)
        holes = cv2.bitwise_not(flood)
        return cv2.bitwise_or(mask, holes)

    def keep_top_k(self, mask, k=2):
        num, labels, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
        if num <= 1: return mask
        areas = [(i, stats[i, cv2.CC_STAT_AREA]) for i in range(1,num)]
        areas.sort(key=lambda x:x[1], reverse=True)
        out = np.zeros_like(mask)
        for i,_ in areas[:min(k,len(areas))]:
            out[labels==i] = 255
        return out

    def _remove_bg_via_api(self, bgr):
        """Call remove.bg API to remove background"""
        api_key = os.environ.get("REMOVE_BG_API_KEY")
        if not api_key:
            return None

        # Encode image to bytes
        _, buffer = cv2.imencode('.png', bgr)
        img_bytes = buffer.tobytes()

        try:
            response = requests.post(
                'https://api.remove.bg/v1.0/removebg',
                files={'image_file': img_bytes},
                data={'size': 'auto'},
                headers={'X-Api-Key': api_key},
                timeout=10
            )
            if response.status_code == requests.codes.ok:
                # API returns PNG with alpha channel
                nparr = np.frombuffer(response.content, np.uint8)
                img_out = cv2.imdecode(nparr, cv2.IMREAD_UNCHANGED)
                if img_out is not None and img_out.shape[2] == 4:
                    return img_out[:, :, 3] # Return alpha channel as mask
            else:
                print(f"API Error: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"Exception during API call: {e}")
        
        return None

    def mask_from_alpha_or_rembg_or_grabcut(self, bgr, alpha=None):
        H,W = bgr.shape[:2]
        m = None

        # 1. Try provided alpha
        if alpha is not None:
            m = (alpha > 32).astype(np.uint8)*255
        
        # 2. Try External API if configured
        if m is None and self.use_external:
            print(">>> [Processor] Attempting External API removal...")
            alpha_api = self._remove_bg_via_api(bgr)
            if alpha_api is not None:
                print(">>> [Processor] External API removal successful!")
                # API result might need resizing if it returns different size
                if alpha_api.shape[:2] != (H, W):
                    alpha_api = cv2.resize(alpha_api, (W, H), interpolation=cv2.INTER_NEAREST)
                m = (alpha_api > 32).astype(np.uint8)*255
            else:
                print(">>> [Processor] External API removal failed! Falling back...")

        # 3. Fallback to Local Rembg
        if m is None and HAS_REMBG:
            print(">>> [Processor] Attempting Local rembg removal...")
            try:
                # Lazy initialize session if not already done
                if self.rembg_session is None:
                    print(">>> [Processor] Initializing local rembg session (may take a moment)...")
                    self.rembg_session = new_session("u2netp")

                bgra = cv2.cvtColor(bgr, cv2.COLOR_BGR2BGRA)
                out  = rembg_remove(bgra, session=self.rembg_session)
                a    = out[:,:,3]
                m = (a > 32).astype(np.uint8)*255
            except Exception as e:
                print(f"Local rembg failed: {e}")

        # 4. Fallback to Grabcut
        if m is None:
            print(">>> [Processor] Falling back to GrabCut...")
            margin = max(10, int(0.05*min(H,W)))
            rect = (margin, margin, W-2*margin, H-2*margin)
            gc_mask = np.zeros((H,W), np.uint8)
            bgdModel = np.zeros((1,65), np.float64)
            fgdModel = np.zeros((1,65), np.float64)
            cv2.grabCut(bgr, gc_mask, rect, bgdModel, fgdModel, 7, cv2.GC_INIT_WITH_RECT)
            m = np.where((gc_mask==cv2.GC_FGD)|(gc_mask==cv2.GC_PR_FGD),255,0).astype(np.uint8)
        # 정제
        k_open  = max(3, int(0.006*min(H,W))); k_open  += (k_open%2==0)
        k_close = max(7, int(0.012*min(H,W))); k_close += (k_close%2==0)
        ker_o = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k_open,  k_open))
        ker_c = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k_close, k_close))
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN,  ker_o, 1)
        m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, ker_c, 1)
        m = self.remove_small_components(m, int(0.003*H*W))
        m = self.fill_holes(m)
        return self.keep_top_k(m, 2)

    def split_left_right_by_mask(self, mask):
        num, labels = cv2.connectedComponents(mask)
        if num-1 >= 2:
            areas = [(i, int((labels==i).sum())) for i in range(1,num)]
            areas.sort(key=lambda x:x[1], reverse=True)
            i1,i2 = areas[0][0], areas[1][0]
            m1 = ((labels==i1).astype(np.uint8))*255
            m2 = ((labels==i2).astype(np.uint8))*255
        else:
            ys,xs = np.where(mask>0)
            if xs.size<200: raise RuntimeError("전경 픽셀이 너무 적습니다.")
            X = xs.reshape(-1,1).astype(np.float32)
            pred = KMeans(n_clusters=2, n_init=10, random_state=self.SEED).fit_predict(X)
            left_cluster = np.argmin([X[pred==k].mean() for k in [0,1]])
            m1 = np.zeros_like(mask); m1[ys[pred==left_cluster], xs[pred==left_cluster]] = 255
            m2 = np.zeros_like(mask); m2[ys[pred!=left_cluster], xs[pred!=left_cluster]] = 255
            m1, m2 = self.fill_holes(m1), self.fill_holes(m2)

        def cx(m):
            ys,xs = np.where(m>0); return xs.mean() if xs.size else np.inf
        left, right = (m1,m2) if cx(m1) < cx(m2) else (m2,m1)
        return left, right

    def crop_by_mask(self, img, mask, pad=10):
        ys,xs = np.where(mask>0)
        if len(ys) == 0:
            return None, None, None
        y0,y1 = max(0, ys.min()-pad), min(img.shape[0], ys.max()+pad+1)
        x0,x1 = max(0, xs.min()-pad), min(img.shape[1], xs.max()+pad+1)
        return img[y0:y1, x0:x1].copy(), mask[y0:y1, x0:x1].copy(), (x0,y0,x1,y1)

    def external_contour(self, maskROI):
        cnts,_ = cv2.findContours(maskROI, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        if not cnts: return None
        return max(cnts, key=cv2.contourArea).reshape(-1,2).astype(np.float32)

    def signed_curvature(self, points, k=5):
        if points is None or len(points) < (2*k+1): return []
        curv=[]
        N=len(points)
        for i in range(k, N-k):
            p_prev = points[i-k]; p = points[i]; p_next = points[i+k]
            v1 = p - p_prev; v2 = p_next - p
            cross = v1[0]*v2[1] - v1[1]*v2[0]
            dot   = v1[0]*v2[0] + v1[1]*v2[1]
            ang = math.atan2(abs(cross), dot+1e-6)
            curv.append((i, np.sign(cross)*ang, (int(p[0]), int(p[1]))))
        return curv

    def pick_two_convex_peaks_in_bottom(self, cont, k, roi_ymin, roi_ymax, bbox_mid_x):
        idx = np.where((cont[:,1] > roi_ymin) & (cont[:,1] < roi_ymax))[0]
        if len(idx) < (2*k+1):
            k = max(3, min(k, max(1, len(idx)//6)))
        roi_pts = cont[idx]
        curvs = self.signed_curvature(roi_pts, k=k)
        if not curvs: return None, None
        left, right = [], []
        for _, c, (x,y) in curvs:
            if x < bbox_mid_x and c > 0: left.append(((x,y), c))
            if x >= bbox_mid_x and c > 0: right.append(((x,y), c))
        if not left:
            for _, c, (x,y) in curvs:
                if x < bbox_mid_x: left.append(((x,y), abs(c)))
        if not right:
            for _, c, (x,y) in curvs:
                if x >= bbox_mid_x: right.append(((x,y), abs(c)))
        lp = max(left,  key=lambda t:t[1])[0]  if left  else None
        rp = max(right, key=lambda t:t[1])[0] if right else None
        return lp, rp

    def codeA_midpoint_from_maskROI(self, maskROI):
        cont = self.external_contour(maskROI)
        if cont is None or len(cont)<10:
            return None, None, None, None

        x,y,w,h = cv2.boundingRect(cont.astype(np.int32))
        roi_ymin = int(y + self.ROI_Y_MIN_FRAC * h)
        roi_ymax = int(y + self.ROI_Y_MAX_FRAC * h)
        mid_x    = x + w//2

        lp, rp = self.pick_two_convex_peaks_in_bottom(cont, self.CURV_K, roi_ymin, roi_ymax, mid_x)
        if lp is None or rp is None:
            return cont, (x,y,w,h), None, (roi_ymin, roi_ymax)

        mx, my = int(round((lp[0]+rp[0])/2.0)), int(round((lp[1]+rp[1])/2.0))
        return cont, (x,y,w,h), {"lp":lp, "rp":rp, "mid":(mx,my)}, (roi_ymin, roi_ymax)

    def heel_point_from_brown_band(
        self, maskROI, bottom_frac=0.45, thr_mode="percentile", thr_value=65.0,
        min_area_frac=3e-4, use_seed=True, topN_seed=400, bottom_band_thickness_frac=0.015
    ):
        H, W = maskROI.shape[:2]
        if H < 5 or W < 5:
            return None

        y_cut = int(H * (1.0 - float(bottom_frac)))
        band_mask = (maskROI > 0).astype(np.uint8)
        band_mask[:y_cut, :] = 0
        if int(band_mask.sum()) < 25:
            y_cut_fb = int(H * 0.70)
            band_mask = (maskROI > 0).astype(np.uint8)
            band_mask[:y_cut_fb, :] = 0

        dist = cv2.distanceTransform((maskROI>0).astype(np.uint8), cv2.DIST_L2, 3).astype(np.float32)
        valid = dist[band_mask==1]
        
        d_norm = np.zeros_like(dist, np.float32)
        if valid.size >= 10 and float(valid.max()) > 0:
            vmin, vmax = float(valid.min()), float(valid.max())
            if vmax - vmin < 1e-6:
                d_norm[band_mask==1] = 0.0
            else:
                d_norm[band_mask==1] = (valid - vmin) / (vmax - vmin)
        else:
            mn, mx = float(dist.min()), float(dist.max())
            if mx - mn < 1e-6:
                pass
            else:
                d_norm = (dist - mn) / (mx - mn + 1e-8)

        if thr_mode == "percentile":
            src_vals = d_norm[band_mask==1]
            if src_vals.size >= 10:
                thr = float(np.percentile(src_vals, float(thr_value)))
            else:
                thr = 0.6
        else:
            thr = float(thr_value)

        cand = ((d_norm >= thr) & (band_mask == 1)).astype(np.uint8)
        min_area = int(max(10, min_area_frac * H * W))
        num, labels, stats, _ = cv2.connectedComponentsWithStats((cand*255).astype(np.uint8), 8)
        keep = np.zeros_like(cand, np.uint8)
        for i in range(1, num):
            area = stats[i, cv2.CC_STAT_AREA]
            if area >= min_area:
                keep[labels==i] = 1

        best = None
        if keep.sum() > 0:
            ys, xs = np.where(keep == 1)
            y_max = int(ys.max())
            band_h = max(3, int(round(bottom_band_thickness_frac * H)))
            y0 = max(0, y_max - band_h + 1)
            band_strip = np.zeros_like(keep, np.uint8)
            band_strip[y0:y_max+1, :] = 1
            strip = ((keep == 1) & (band_strip == 1))
            if np.count_nonzero(strip) > 0:
                ys_s, xs_s = np.where(strip)
                y_max_strip = int(ys_s.max())
                xs_bottom = xs_s[ys_s == y_max_strip]
                if xs_bottom.size >= 2:
                    xL = int(xs_bottom.min())
                    xR = int(xs_bottom.max())
                    best = (int(round((xL + xR) / 2.0)), y_max_strip)
                else:
                    xs_all = xs_s
                    if xs_all.size >= 2:
                        xL = int(xs_all.min())
                        xR = int(xs_all.max())
                        best = (int(round((xL + xR) / 2.0)), y_max_strip)

        if best is None:
            yy, xx = np.unravel_index(np.argmax(dist * band_mask, axis=None), dist.shape)
            best = (int(xx), int(yy))
        return best

    def choose_scan_rows_upper_band(self, h_local, y0_global, H_full, n, top_frac, mid_frac, upper_cap_frac):
        y_cap_global = int(H_full * upper_cap_frac)
        max_local = min(h_local-1, y_cap_global - y0_global)
        if max_local < 1:
            return []
        y_top = int(h_local * top_frac)
        y_mid = int(h_local * mid_frac)
        y_start = max(0, min(y_top, max_local))
        y_end   = max(0, min(y_mid, max_local))
        if y_end - y_start < 2:
            ys = np.linspace(0, max_local, max(3, n+2), dtype=int)
        else:
            base = np.linspace(y_start, y_end, n, dtype=int).tolist()
            base = [y_start] + base + [y_end]
            ys = np.array(sorted(set(base)), dtype=int)
        ys = sorted(set(int(y) for y in ys if 0 <= y <= max_local))
        if len(ys) < 3 and max_local >= 2:
            ys = sorted(set([0, max_local//2, max_local]))
        return ys

    def dedup_close(self, xs, tol=0.5):
        xs = sorted(xs); out=[]
        for x in xs:
            if not out or abs(x - out[-1]) > tol:
                out.append(x)
        return out

    def contour_scanline_intersections(self, cont, y):
        xs = []
        N = len(cont)
        for i in range(N):
            x1, y1 = cont[i]; x2, y2 = cont[(i+1)%N]
            if y1 == y2: continue
            ymin, ymax = (y1, y2) if y1 < y2 else (y2, y1)
            if (y >= ymin) and (y < ymax):
                t = (y - y1) / (y2 - y1)
                xs.append(float(x1 + t * (x2 - x1)))
        xs = self.dedup_close(xs, tol=0.5); xs.sort()
        return xs

    def pick_edge_pair(self, xs, min_width):
        if len(xs) < 2: return None
        xL, xR = xs[0], xs[-1]
        if (xR - xL) >= min_width: return (xL, xR)
        pairs = [(xs[i], xs[i+1]) for i in range(0, len(xs)-1, 2)]
        cands = [(r-l, l, r) for (l, r) in pairs if (r-l) >= min_width]
        if cands:
            _, l, r = max(cands, key=lambda t:t[0]); return (l, r)
        return None

    def fit_line_least_squares(self, points, h, w):
        ys = np.array([p[1] for p in points], float)
        xs = np.array([p[0] for p in points], float)
        A = np.vstack([ys, np.ones_like(ys)]).T
        a, b = np.linalg.lstsq(A, xs, rcond=None)[0]
        y0, y1 = 0.0, float(h-1)
        x0 = np.clip(a*y0 + b, 0, w-1)
        x1 = np.clip(a*y1 + b, 0, w-1)
        return (int(round(x0)), 0), (int(round(x1)), h-1), (a, b)

    def foot_axis_line_from_ROI(self, imgROI, maskROI, y0_global, H_full):
        cont = self.external_contour(maskROI)
        if cont is None:
            raise RuntimeError("ROI에서 외곽선 없음")
        h, w = imgROI.shape[:2]
        scan_ys = self.choose_scan_rows_upper_band(
            h_local=h, y0_global=y0_global, H_full=H_full,
            n=self.N_SCAN, top_frac=self.TOP_FRAC, mid_frac=self.MID_FRAC,
            upper_cap_frac=self.UPPER_CAP_FRAC
        )
        min_width = max(6.0, self.MIN_WIDTH_FRAC * w)
        picked_pts=[]
        for y in scan_ys:
            xs = self.contour_scanline_intersections(cont, float(y))
            pair = self.pick_edge_pair(xs, min_width)
            if pair is None: continue
            xL, xR = pair
            picked_pts.append((0.5*(xL+xR), float(y)))
        if len(picked_pts) < 2:
            raise RuntimeError("교점 중점이 2개 미만")
        p0, p1, (a, b) = self.fit_line_least_squares(picked_pts, h, w)
        return p0, p1, (a, b)

    def line_angle_deg(self, v1, v2):
        v1 = np.array(v1, float); v2 = np.array(v2, float)
        n1 = np.linalg.norm(v1); n2 = np.linalg.norm(v2)
        if n1<1e-8 or n2<1e-8: return None
        cos_t = np.clip(np.dot(v1, v2)/(n1*n2), -1.0, 1.0)
        return float(np.degrees(np.arccos(cos_t)))

    def _process_one_side(self, img, m_side, side_tag):
        if m_side is None or np.count_nonzero(m_side) < 20:
             return None

        ret_crop = self.crop_by_mask(img, m_side, self.PAD)
        if ret_crop[0] is None:
            return None
        roi_img, roi_mask, (x0,y0,x1,y1) = ret_crop

        cont, bbox, ptsA, _ = self.codeA_midpoint_from_maskROI(roi_mask)
        if not ptsA or ("mid" not in ptsA):
            return None
        M_local = ptsA["mid"]

        H_local = self.heel_point_from_brown_band(roi_mask)
        if H_local is None:
            return None

        try:
            p0C_local, p1C_local, (aC,bC) = self.foot_axis_line_from_ROI(roi_img, roi_mask, y0, img.shape[0])
        except Exception as e:
            return None

        M_global   = (int(M_local[0]+x0),  int(M_local[1]+y0))
        H_global   = (int(H_local[0]+x0),  int(H_local[1]+y0))
        p0C_global = (int(p0C_local[0]+x0),int(p0C_local[1]+y0))
        p1C_global = (int(p1C_local[0]+x0),int(p1C_local[1]+y0))

        v1 = (H_global[0]-M_global[0], H_global[1]-M_global[1])
        v3 = (p1C_global[0]-p0C_global[0], p1C_global[1]-p0C_global[1])
        theta = self.line_angle_deg(v1, v3)

        if theta is None: return None

        return {
            "M_global": M_global,
            "H_global": H_global,
            "p0": p0C_global,
            "p1": p1C_global,
            "angle": theta,
            "bbox": (x0,y0,x1,y1)
        }

    def _calculate_pipline_features(self, L, R):
        import pandas as pd
        left_angle = L["angle"]
        right_angle = R["angle"]
        mean_angle = (left_angle + right_angle) / 2
        diff_angle = abs(left_angle - right_angle)
        
        M_x = (L["M_global"][0] + R["M_global"][0]) / 2
        M_y = (L["M_global"][1] + R["M_global"][1]) / 2
        H_x = (L["H_global"][0] + R["H_global"][0]) / 2
        H_y = (L["H_global"][1] + R["H_global"][1]) / 2
        
        p0_x = (L["p0"][0] + R["p0"][0]) / 2
        p0_y = (L["p0"][1] + R["p0"][1]) / 2
        p1_x = (L["p1"][0] + R["p1"][0]) / 2
        p1_y = (L["p1"][1] + R["p1"][1]) / 2
        
        bx0 = (L["bbox"][0] + R["bbox"][0]) / 2
        by0 = (L["bbox"][1] + R["bbox"][1]) / 2
        bx1 = (L["bbox"][2] + R["bbox"][2]) / 2
        by1 = (L["bbox"][3] + R["bbox"][3]) / 2
        bw = bx1 - bx0
        bh = by1 - by0

        dist_MH = math.sqrt((M_x - H_x)**2 + (M_y - H_y)**2)
        slope_MH = (H_y - M_y) / (H_x - M_x + 1e-6)
        tibia_len = math.sqrt((p1_x - p0_x)**2 + (p1_y - p0_y)**2)
        tibia_slope = (p1_y - p0_y) / (p1_x - p0_x + 1e-6)
        M_x_rel = (M_x - bx0) / (bw + 1e-6)
        M_y_rel = (M_y - by0) / (bh + 1e-6)

        X = np.array([[
            left_angle, right_angle, mean_angle, diff_angle,
            dist_MH, slope_MH, tibia_len, tibia_slope, M_x_rel, M_y_rel
        ]])
        
        cols = ["left_angle", "right_angle", "mean_angle", "diff_angle", "dist_MH", "slope_MH", "tibia_len", "tibia_slope", "M_x_rel", "M_y_rel"]
        return pd.DataFrame(X, columns=cols)
