function Color(raw) {
    function rnd() {
        return Math.floor(Math.random() * 1000) / 1000;
    }
    var color = raw ? raw : [rnd(), rnd(), rnd()];
    var driver = {
        use(fn) {
            fn(color);
            return driver;
        },
        rgb(fn) {
            fn(`rgb(${Math.floor(color[0]*255)},${Math.floor(color[1]*255)},${Math.floor(color[2]*255)})`);
            return driver;
        },
        set(raw) {
            color = raw ? raw : [rnd(), rnd(), rnd()];
            return driver;
        },
        isdark() {
            return ((color[0]*255 * 299 + color[1]*255 * 587 + color[2]*255 * 114) / 1000) < (127.5)
        }
    }
    return driver;
}






function app() {
    var bdark = document.getElementById("dark");
    var blight = document.getElementById("light");
    var bauto = document.getElementById("auto");
    var bfeed = document.getElementById("feed");
    var bset = document.getElementById("set");
    var bg = document.body;

    var data = [];

    function add(raw, isdark) { // add([0.1, 0.3, 0.99], 1);
        data.push(raw[0]);
        data.push(raw[1]);
        data.push(raw[2]);
        data.push(isdark);
        bset.innerHTML = data.length / 4;
    }

    var current = Color()
    
    function another(raw) {
        current = Color().set(raw);
        current.rgb(clr => {
            bg.style.backgroundColor = clr
        });
    }
    blight.onclick = function light() {
        current.use(clr => add(clr, 0));
        another();
    }

    bdark.onclick = function dark() {
        current.use(clr => add(clr, 1));
        another();
    }
    bauto.onclick = function isdark() {
        for(var i = 0; i < 100; i++) {
            current.use(clr => add(clr, current.isdark()));
            another();
        }
    }

    var brain = null;
    bfeed.onclick = async function feed() {
        bfeed.setAttribute("disabled", "")
        bfeed.setAttribute("value", "feeding...")
        blight.setAttribute("disabled", "")
        bdark.setAttribute("disabled", "")
        bauto.setAttribute("disabled", "")
        try {
            brain = await fetch("/feed", {
                method: "POST",
                mode: "cors", // no-cors, cors, *same-origin
                cache: "no-cache",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                },
                redirect: "follow",
                referrer: "no-referrer",
                body: JSON.stringify(data),
            });
            brain = await brain.json();
            brain = JSON.parse(brain);
            console.log(brain)
            if(brain.error)
                throw brain;
            bfeed.removeAttribute("disabled")
            bfeed.setAttribute("value", "again")
            bfeed.onclick = again;
            isfeedback = true;
            feedback();
        } catch (err) {
            alert("Oops !");
            console.error(err);
            bfeed.removeAttribute("disabled")
            bfeed.setAttribute("value", "feed")
            blight.removeAttribute("disabled")
            bdark.removeAttribute("disabled")
            bauto.removeAttribute("disabled")
            brain = null;
        }
    }

    function useBrain() {
        // brain = [w11,..w38,b1..b8,e1..e8,be]
        var brn = brain
        var hn = brn.w[0].length;
        var c = [0, 0, 0]
        current.use(e => {
            c[0] = e[0]
            c[1] = e[1]
            c[2] = e[2]
        });
        var h = [];
        for (var j = 0; j < hn; j++) {
            h[j] = brn.b[0][j];
            for (var i = 0; i < 3; i++) {
                h[j] += c[i] * brn.w[i][j];
            }
        }
        var out = brn.e[0][0];
        for (var j = 0; j < hn; j++) {
            out += h[j] * brn.E[j][0];
        }
        out = 1 / (1 + Math.exp(-out));
        console.log(out)
        return out > 0.5 ? "dark" : "light";
    }

    var isfeedback = false;

    function feedback(raw) {
        another(raw);
        var out = useBrain();
        bset.innerHTML = out + " <br>correct: " + (out == (current.isdark() ? "dark" : "light") ? "Yes" : "No");
        if (isfeedback && brain)
            setTimeout(feedback, 500);
    }
    
    function again() {
        isfeedback = false;
        bfeed.removeAttribute("disabled")
        bfeed.setAttribute("value", "feed")
        blight.removeAttribute("disabled")
        bdark.removeAttribute("disabled")
        bauto.removeAttribute("disabled")
        bfeed.onclick = feed;
        data = [];
        brain = null;
        another();
    }

    another();
}

app();