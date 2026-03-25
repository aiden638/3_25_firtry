import re

with open("processor.py", "r") as f:
    content = f.read()

# _get_mask and _split_left_right to replace
new_mask_methods = """
    def _get_mask(self, bgr):
        H, W = bgr.shape[:2]
        if HAS_REMBG:
            bgra = cv2.cvtColor(bgr, cv2.COLOR_BGR2BGRA)
            out = rembg_remove(bgra)
            if out.shape[2] == 4:
                a = out[:,:,3]
                m = (a > 32).astype(np.uint8)*255
            else:
                gray = cv2.cvtColor(out, cv2.COLOR_BGR2GRAY)
                _, m = cv2.threshold(gray, 10, 255, cv2.THRESH_BINARY)
        else:
            margin = max(10, int(0.05*min(H,W)))
            rect = (margin, margin, W-2*margin, H-2*margin)
            gc_mask = np.zeros((H,W), np.uint8)
            bgdModel = np.zeros((1,65), np.float64)
            fgdModel = np.zeros((1,65), np.float64)
            cv2.grabCut(bgr, gc_mask, rect, bgdModel, fgdModel, 7, cv2.GC_INIT_WITH_RECT)
            m = np.where((gc_mask==cv2.GC_FGD)|(gc_mask==cv2.GC_PR_FGD),255,0).astype(np.uint8)
            
        k_open  = max(3, int(0.006*min(H,W))); k_open  += (k_open%2==0)
        k_close = max(7, int(0.012*min(H,W))); k_close += (k_close%2==0)
        ker_o = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k_open,  k_open))
        ker_c = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k_close, k_close))
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN,  ker_o, 1)
        m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, ker_c, 1)
        
        # Remove small
        num, labels, stats, _ = cv2.connectedComponentsWithStats(m, 8)
        out1 = np.zeros_like(m)
        min_area = int(0.003*H*W)
        for i in range(1, num):
            if stats[i, cv2.CC_STAT_AREA] >= min_area:
                out1[labels == i] = 255
        m = out1
        
        # Fill holes
        h_shape, w_shape = m.shape
        inv = cv2.bitwise_not(m)
        flood = inv.copy()
        flood_mask = np.zeros((h_shape+2, w_shape+2), np.uint8)
        cv2.floodFill(flood, flood_mask, (0,0), 255)
        holes = cv2.bitwise_not(flood)
        m = cv2.bitwise_or(m, holes)
        
        # Keep top 2
        num, labels, stats, _ = cv2.connectedComponentsWithStats(m, 8)
        if num > 2:
            areas = [(i, stats[i, cv2.CC_STAT_AREA]) for i in range(1,num)]
            areas.sort(key=lambda x:x[1], reverse=True)
            out2 = np.zeros_like(m)
            for i,_ in areas[:min(2,len(areas))]:
                out2[labels==i] = 255
            m = out2
            
        return m

    def _split_left_right(self, mask):
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
            pred = KMeans(n_clusters=2, n_init=10, random_state=0).fit_predict(X)
            left_cluster = np.argmin([X[pred==k].mean() for k in [0,1]])
            m1 = np.zeros_like(mask); m1[ys[pred==left_cluster], xs[pred==left_cluster]] = 255
            m2 = np.zeros_like(mask); m2[ys[pred!=left_cluster], xs[pred!=left_cluster]] = 255
            # Fill holes again
            for m_tmp in [m1, m2]:
                h_s, w_s = m_tmp.shape
                inv = cv2.bitwise_not(m_tmp)
                flood = inv.copy()
                fm = np.zeros((h_s+2, w_s+2), np.uint8)
                cv2.floodFill(flood, fm, (0,0), 255)
                m_tmp[:] = cv2.bitwise_or(m_tmp, cv2.bitwise_not(flood))

        def cx(m):
            ys,xs = np.where(m>0); return xs.mean() if xs.size else np.inf
        left, right = (m1,m2) if cx(m1) < cx(m2) else (m2,m1)
        return left, right
"""

content = re.sub(r'    def _get_mask\(self, bgr\):.*?return m\n\n    def _split_left_right\(self, mask\):.*?return left, right', new_mask_methods, content, flags=re.DOTALL)

with open("processor.py", "w") as f:
    f.write(content)
