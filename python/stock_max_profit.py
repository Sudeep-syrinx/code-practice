def max_profit(prices):
    if not prices:
        return 0
    min_price = float('inf')
    max_profit = 0
    for price in prices:
        if price < min_price:
            min_price = price
        elif price - min_price > max_profit:
            max_profit = price - min_price
    return max_profit

if __name__ == "__main__":
    prices = [7, 1, 5, 3, 6, 4]
    profit = max_profit(prices)
    print("Prices:", prices)
    print("Max Profit:", profit)
    print("Test passed:", profit == 5)
