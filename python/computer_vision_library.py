"""
A Pure Python Computer Vision and Image Processing Library.
Includes Convolution, Gaussian Blur, Sobel Edge Detection, and Harris Corners.
"""

import math

class Image:
    def __init__(self, width, height, pixels=None):
        self.width = width
        self.height = height
        if pixels:
            self.pixels = pixels
        else:
            self.pixels = [[0.0 for _ in range(width)] for _ in range(height)]

    def get_pixel(self, x, y):
        if 0 <= x < self.width and 0 <= y < self.height:
            return self.pixels[y][x]
        return 0.0

    def set_pixel(self, x, y, value):
        if 0 <= x < self.width and 0 <= y < self.height:
            self.pixels[y][x] = value

    @staticmethod
    def convolve(image, kernel):
        kh = len(kernel)
        kw = len(kernel[0])
        offset_x = kw // 2
        offset_y = kh // 2
        result = Image(image.width, image.height)
        
        for y in range(image.height):
            for x in range(image.width):
                sum_val = 0.0
                for ky in range(kh):
                    for kx in range(kw):
                        px = x + kx - offset_x
                        py = y + ky - offset_y
                        sum_val += image.get_pixel(px, py) * kernel[ky][kx]
                result.set_pixel(x, y, sum_val)
        return result

    @staticmethod
    def gaussian_blur(image, sigma=1.0):
        size = int(2 * round(3 * sigma) + 1)
        center = size // 2
        kernel = [[0.0 for _ in range(size)] for _ in range(size)]
        total = 0.0
        
        for y in range(size):
            for x in range(size):
                dx = x - center
                dy = y - center
                val = math.exp(-(dx*dx + dy*dy) / (2 * sigma * sigma))
                kernel[y][x] = val
                total += val
                
        for y in range(size):
            for x in range(size):
                kernel[y][x] /= total
                
        return Image.convolve(image, kernel)

    @staticmethod
    def sobel_edge_detection(image):
        kx = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]
        ky = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]]
        
        gx = Image.convolve(image, kx)
        gy = Image.convolve(image, ky)
        
        result = Image(image.width, image.height)
        for y in range(image.height):
            for x in range(image.width):
                magnitude = math.sqrt(gx.get_pixel(x, y)**2 + gy.get_pixel(x, y)**2)
                result.set_pixel(x, y, min(255.0, magnitude))
        return result

    @staticmethod
    def harris_corner_detection(image, threshold=1000, k=0.04):
        kx = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]
        ky = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]]
        
        ix = Image.convolve(image, kx)
        iy = Image.convolve(image, ky)
        
        ixx = Image(image.width, image.height)
        iyy = Image(image.width, image.height)
        ixy = Image(image.width, image.height)
        
        for y in range(image.height):
            for x in range(image.width):
                ix_val = ix.get_pixel(x, y)
                iy_val = iy.get_pixel(x, y)
                ixx.set_pixel(x, y, ix_val * ix_val)
                iyy.set_pixel(x, y, iy_val * iy_val)
                ixy.set_pixel(x, y, ix_val * iy_val)
                
        sxx = Image.gaussian_blur(ixx, 1.5)
        syy = Image.gaussian_blur(iyy, 1.5)
        sxy = Image.gaussian_blur(ixy, 1.5)
        
        corners = []
        for y in range(1, image.height - 1):
            for x in range(1, image.width - 1):
                a = sxx.get_pixel(x, y)
                b = sxy.get_pixel(x, y)
                c = syy.get_pixel(x, y)
                det = (a * c) - (b * b)
                trace = a + c
                response = det - k * (trace * trace)
                if response > threshold:
                    corners.append((x, y))
        return corners

if __name__ == "__main__":
    print("Testing Computer Vision Algorithms...")
    img = Image(10, 10)
    for y in range(10):
        for x in range(10):
            img.set_pixel(x, y, 255.0 if (x == 5 or y == 5) else 0.0)
            
    blurred = Image.gaussian_blur(img, 1.0)
    edges = Image.sobel_edge_detection(blurred)
    corners = Image.harris_corner_detection(blurred, threshold=10)
    
    print("Detected Edges Sample Pixel (5, 2):", edges.get_pixel(5, 2))
    print("Detected Corners Count:", len(corners))
    print("Corner Detection Complete.")
