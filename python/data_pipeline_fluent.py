class Pipeline:
    def __init__(self):
        self.stages = []

    def add_stage(self, func):
        self.stages.append(func)
        return self

    def execute(self, data):
        for stage in self.stages:
            data = stage(data)
        return data

def clean(data):
    return [x.strip() for x in data if x.strip()]

def capitalize(data):
    return [x.title() for x in data]

def filter_short(data):
    return [x for x in data if len(x) > 3]

if __name__ == "__main__":
    raw_data = ["  apple ", "  PI ", "  banana  ", "", "  cherry  "]
    
    pipeline = Pipeline().add_stage(clean).add_stage(capitalize).add_stage(filter_short)
    result = pipeline.execute(raw_data)
    
    print("Raw Data:", raw_data)
    print("Processed:", result)
    print("Expected:", ["Apple", "Banana", "Cherry"])
    print("Pipeline success:", result == ["Apple", "Banana", "Cherry"])
