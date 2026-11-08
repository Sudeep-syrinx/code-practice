import numpy as np

class SimpleRNN:
    def __init__(self, input_size, hidden_size, output_size):
        self.input_size = input_size
        self.hidden_size = hidden_size
        self.output_size = output_size
        
        self.Wxh = np.random.randn(hidden_size, input_size) * 0.01
        self.Whh = np.random.randn(hidden_size, hidden_size) * 0.01
        self.Why = np.random.randn(output_size, hidden_size) * 0.01
        self.bh = np.zeros((hidden_size, 1))
        self.by = np.zeros((output_size, 1))
        
    def forward(self, inputs, h_prev):
        xs, hs, ys, ps = {}, {}, {}, {}
        hs[-1] = np.copy(h_prev)
        
        for t in range(len(inputs)):
            xs[t] = np.zeros((self.input_size, 1))
            xs[t][inputs[t]] = 1
            
            hs[t] = np.tanh(np.dot(self.Wxh, xs[t]) + np.dot(self.Whh, hs[t-1]) + self.bh)
            ys[t] = np.dot(self.Why, hs[t]) + self.by
            ps[t] = np.exp(ys[t]) / np.sum(np.exp(ys[t]))
            
        return xs, hs, ps
        
    def loss(self, ps, targets):
        loss = 0
        for t in range(len(targets)):
            loss += -np.log(ps[t][targets[t], 0])
        return loss

if __name__ == "__main__":
    vocab_size = 4
    hidden_size = 10
    rnn = SimpleRNN(vocab_size, hidden_size, vocab_size)
    inputs = [0, 1, 2, 3]
    targets = [1, 2, 3, 0]
    h_prev = np.zeros((hidden_size, 1))
    
    xs, hs, ps = rnn.forward(inputs, h_prev)
    total_loss = rnn.loss(ps, targets)
    print("RNN Forward Pass Complete.")
    print("Total Loss:", round(total_loss, 4))
    print("Output shape:", ps[0].shape)
    print("Test passed:", total_loss > 0)
