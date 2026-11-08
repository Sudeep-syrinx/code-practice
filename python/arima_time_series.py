"""
A Time Series Forecasting Library implementing ARIMA.
Includes Autocorrelation, Differencing, AR, MA, and model fitting.
"""

import math
import random
import statistics

class TimeSeries:
    def __init__(self, data):
        self.data = data

    def difference(self, lag=1):
        return [self.data[i] - self.data[i - lag] for i in range(lag, len(self.data))]

    def mean(self):
        return sum(self.data) / len(self.data)

    def variance(self):
        m = self.mean()
        return sum((x - m)**2 for x in self.data) / len(self.data)

    def autocorrelation(self, lag=1):
        m = self.mean()
        var = self.variance()
        n = len(self.data)
        return sum((self.data[i] - m) * (self.data[i - lag] - m) for i in range(lag, n)) / (n * var)

class ARModel:
    def __init__(self, order=1):
        self.order = order
        self.coefficients = [0.0] * order

    def fit(self, data):
        n = len(data)
        if n <= self.order:
            return
        y = data[self.order:]
        X = [[data[i - j - 1] for j in range(self.order)] for i in range(self.order, n)]
        
        Xt_X = [[sum(X[k][i] * X[k][j] for k in range(len(X))) for j in range(self.order)] for i in range(self.order)]
        Xt_y = [sum(X[k][i] * y[k] for k in range(len(X))) for i in range(self.order)]
        
        self.coefficients = [0.0] * self.order
        for i in range(self.order):
            if Xt_X[i][i] != 0:
                self.coefficients[i] = Xt_y[i] / Xt_X[i][i]

    def predict(self, history):
        return sum(self.coefficients[i] * history[-i - 1] for i in range(self.order))

class MAModel:
    def __init__(self, order=1):
        self.order = order
        self.coefficients = [0.0] * order

    def fit(self, residuals):
        self.coefficients = [statistics.mean(residuals)] * self.order

    def predict(self, recent_errors):
        return sum(self.coefficients[i] * recent_errors[-i - 1] for i in range(self.order))

class ARIMA:
    def __init__(self, p=1, d=1, q=1):
        self.p = p
        self.d = d
        self.q = q
        self.ar = ARModel(p)
        self.ma = MAModel(q)

    def fit(self, data):
        series = TimeSeries(data)
        for _ in range(self.d):
            series = TimeSeries(series.difference())
            
        self.ar.fit(series.data)
        residuals = []
        for i in range(self.p, len(series.data)):
            pred = self.ar.predict(series.data[:i])
            residuals.append(series.data[i] - pred)
            
        self.ma.fit(residuals)
        return self

    def forecast(self, data, steps=5):
        series = TimeSeries(data)
        for _ in range(self.d):
            series = TimeSeries(series.difference())
            
        history = list(series.data)
        errors = [0.0] * self.q
        forecasts = []
        
        for _ in range(steps):
            ar_pred = self.ar.predict(history)
            ma_pred = self.ma.predict(errors)
            pred = ar_pred + ma_pred
            forecasts.append(pred)
            history.append(pred)
            errors.append(0.0)
            errors = errors[-self.q:]
            
        return forecasts

if __name__ == "__main__":
    print("Testing ARIMA Time Series Forecasting...")
    random.seed(42)
    data = [math.sin(i / 2.0) + random.uniform(-0.1, 0.1) for i in range(50)]
    
    arima = ARIMA(p=2, d=1, q=1)
    arima.fit(data)
    
    forecasts = arima.forecast(data, steps=5)
    print("Historical data (last 5):", [f"{x:.3f}" for x in data[-5:]])
    print("Forecasts (next 5):", [f"{x:.3f}" for x in forecasts])
    print("ARIMA model fitting complete.")
