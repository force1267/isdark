import sys
import json # json.loads json.dumps
import numpy as np

def init_data(least = 10):
    raw = json.loads(sys.argv[1])
    if len(raw) < (4 * least):
        return []
    fullset = [[np.array([[ raw[4*i], raw[4*i + 1], raw[4*i + 2] ]]), np.array([[ raw[4*i + 3] ]])] for i in range(0, int(len(raw)/4))]
    if len(fullset) >= 1000:
        return (fullset[0:int(len(fullset)*0.05)], fullset[int(len(fullset)*0.05)+1:])
    else:
        return (fullset[0:len(fullset)-5], fullset[len(fullset)-4:])


def sigmoid(input):
    return 1 / np.exp(input)

def softmax(input):
    unsigma = np.exp(input)
    sigma = 0
    for i in range(0, unsigma.shape[0]):
        sigma += unsigma[i]
    return  (input / sigma)

def crossentropy(y, o): # y expected, o output
    # print(y, o)
    unsigma = (y * np.log(o)) + ((1 - y) * np.log(1 - o))
    sigma = 0
    for i in range(0, unsigma.shape[0]):
        sigma += unsigma[i]
    return (-1 / unsigma.shape[0]) * sigma

def deriv_sigmoid():
    pass
def deriv_crossentropy():
    pass
def deriv(x, w, b, h, S, E, o, oc, y):
    # inputs, weight, bias, hidden layer, sigmoid(h), Effect weight, output, expected output
    # x[1*i] w[i*j] b[1*j] h[1*j] S[1*j] E[j*k] o[1*k] l'[1*k]
    dloss_doutc = -1 * (y * (1 / oc) + (1 - y) * (1 / (1 - oc)))
    doutc_dout = np.exp(-o) / ((1 + np.exp(-o)) ** 2)
    dloss_dout = dloss_doutc * doutc_dout
    dloss_dE = S.T @ dloss_dout.T
    dloss_dw = x.T @ ((dloss_dout @ E.T) * S * (1 - S))
    dloss_de = dloss_dout
    # b[1*j] = l'[1*k] @ (E.T)[k*j] * (S[1*j]*(1 - S[1*j]))[1*j]
    dloss_db = (dloss_dout @ E.T) * S * (1 - S)
    return (dloss_dw, dloss_db, dloss_dE, dloss_de)



class layer:
    def __init__(self, input_num, output_num):
        self.w = np.random.random((input_num, output_num))
        self.b = np.random.random((1, output_num))
    def use(self, input): # X[1*n] * W[n*m] + B[1*m] = O[1*m]
        return input @ self.w + self.b
    def apply(self, fn):
        return fn(self.w, self.b)

class NN:
    def __init__(self, in_n, h_n, o_n, activation_fn, loss_fn, deriv_fn):
        self.hl = layer(in_n, h_n)
        self.ol = layer(h_n, o_n)
        self.acfn = activation_fn
        self.lsfn = loss_fn
        self.deriv_fn = deriv_fn
    def brain(self):
        return { 'w': self.hl.w.tolist(), 'b': self.hl.b.tolist(), 'E': self.ol.w.tolist(), 'e': self.ol.b.tolist() }
    def use(self, input):
        return 1/(1+np.exp(self.ol.use(self.acfn(self.hl.use(input)))))
    def feed(self, input, y, done = 0.05, trainig_rate = 0.05):
        # forward
        h = self.hl.use(input)
        S = self.acfn(h)
        o = self.ol.use(S)
        oc = 1 / (1 + np.exp(-o))
        # backward
        loss = self.lsfn(y, oc)
        # print("loss:", loss)
        # if loss < done:
        #     return True
        dw, db, dE, de = self.deriv_fn(input, self.hl.w, self.hl.b, h, S, self.ol.w, o, oc, y)
        self.hl.w = self.hl.w - (dw * trainig_rate)
        self.hl.b = self.hl.b - (db * trainig_rate)
        self.ol.w = self.ol.w - (dE * trainig_rate)
        self.ol.b = self.ol.b - (de * trainig_rate)
        # return False
        return loss
    def train(self, tset, vset, done = 0.1, trainig_rate = 0.01, cycle = 100): # tset = [[x0,y0], [x1,y1], ...]
        val_ctr = 0
        val_min = 0
        for i in range(0, len(vset)):
            val_min += self.lsfn(vset[0][1], self.use(vset[0][0]))
        val_min /= len(vset)

        ls_ctr = 0
        ls_min = self.lsfn(tset[1], self.use(tset[0]))

        for i in range(0, (len(tset)*cycle)):
            # print(tset[i][1], tset[i][0])
            loss = self.feed(tset[i%len(tset)][0], tset[i%len(tset)][1], done, trainig_rate)
            if loss < ls_min:
                ls_min = loss
                ls_ctr = 0
            else:
                ls_ctr += 1

            aloss = 0
            for i in range(0, len(vset)):
                aloss += self.lsfn(vset[i][1], self.use(vset[i][0]))
            aloss /= len(vset)
            if aloss < val_min:
                val_min = aloss
                val_ctr = 0
            else:
                val_ctr += 1
            
            if (val_ctr - ls_ctr) > (len(tset) * 0.05):
                print('{"error":"overfitting"}')
                return False
            if (aloss < done):
                return True
        print('{"error":"loss not minimized", "loss":{aloss}}')
        return False



# test

dataset, valset = init_data()
dl = NN(3, 50, 1, softmax, crossentropy, deriv)
if dl.train(dataset, valset):
    print(json.dumps(dl.brain()))