def next_greater(values):
    result = [-1] * len(values)
    stack = []
    for i, v in enumerate(values):
        while stack and values[stack[-1]] < v:
            result[stack.pop()] = v
        stack.append(i)
    return result


def previous_smaller(values):
    result = [-1] * len(values)
    stack = []
    for i, v in enumerate(values):
        while stack and values[stack[-1]] >= v:
            stack.pop()
        result[i] = values[stack[-1]] if stack else -1
        stack.append(i)
    return result


def largest_rectangle(heights):
    stack = []
    best = 0
    heights = heights + [0]
    for i, h in enumerate(heights):
        while stack and heights[stack[-1]] > h:
            height = heights[stack.pop()]
            width = i if not stack else i - stack[-1] - 1
            best = max(best, height * width)
        stack.append(i)
    return best


def daily_temperatures(temps):
    result = [0] * len(temps)
    stack = []
    for i, t in enumerate(temps):
        while stack and temps[stack[-1]] < t:
            j = stack.pop()
            result[j] = i - j
        stack.append(i)
    return result


if __name__ == "__main__":
    print("Next greater   :", next_greater([2, 1, 2, 4, 3]))
    print("Prev smaller   :", previous_smaller([2, 1, 2, 4, 3]))
    print("Largest rect   :", largest_rectangle([2, 1, 5, 6, 2, 3]))
    print("Temperatures   :", daily_temperatures([73, 74, 75, 71, 69, 72, 76, 73]))
    print("Expected       :", [1, 1, 4, 2, 1, 1, 0, 0])
