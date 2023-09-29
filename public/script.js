const canvasElm = document.getElementById("canvas");
const displayLink = document.getElementById("displaylink");
const topElement = document.getElementById("top");
const nameElement = document.getElementById("name");
const messageList = document.getElementById("messagelist");
const messageInput = document.getElementById("messageinput");
const ulist = document.getElementById("ulist");
const serror = document.getElementById("serror");
const changeName = document.getElementById("changename");
const socket = io();

socket.on("connect", () => {
  console.log("Connected!");
  socket.emit("getusers");
});

const ctx = canvasElm.getContext("2d");
const colors = [
  "red",
  "green",
  "blue",
  "orange",
  "cyan",
  "lime",
  "magenta",
  "yellow",
  "navy",
  "black",
];
let cooldown = 0;
let canvas = {};

// function generate() {
//   let ii = 0;
//   for (ii++; ii < 40; ) {
//     for (let i = 0; i < 40; ) {
//       let color = Math.floor(Math.random() * 11);
//       ctx.fillStyle = colors[color];
//       ctx.fillRect(i * 20, ii * 20, 20, 20);
//       i++;
//     }
//     ii++;
//   }
// }

let usernames = [];

let username;
let pickingcolor;
let kickreason = "No Reason Given.";
let hideMouse = true;

socket.on("anonname", (data) => {
  username = data;
});

socket.on("predisconnect", (data) => {
  kickreason = data;
});

function navdisplay() {
  if (displayLink.innerText == "Hide") {
    topElement.setAttribute("style", "display: none;");
    displayLink.innerText = "Show";
  } else {
    topElement.setAttribute("style", "display: initial;");
    displayLink.innerText = "Hide";
  }
}

function pickcolor() {
  pickingcolor = 1;
}

changeName.onclick = () => {
  let username = nameElement.value;

  nameElement.value = "";

  localStorage.setItem("Username", username);

  socket.emit("username", { name: username });
};

document.getElementById("sendform").addEventListener("submit", (e) => {
  e.preventDefault();
  socket.emit("chat-message", {
    username: username,
    message: messageInput.value,
  });

  messageInput.value = "";
});

socket.on("chat-message", (data) => {
  let newmessage = document.createElement("li");
  newmessage.id = "msg-" + data.id;
  newmessage.textContent = `${data.username}: ${data.message}`;
  messageList.prepend(newmessage);
});

socket.on("remove-chat-msg", (data) => {
  try {
    document.getElementById("msg-" + data.id).remove();
  } catch (error) {
    console.log("Error removing ID " + data.id);
    console.log(error);
  }
});

socket.on("get-chat", (data) => {
  data.forEach((msg) => {
    if (msg.username != "") {
      let newmessage = document.createElement("li");
      newmessage.id = "msg-" + msg.id;
      newmessage.textContent = `${msg.username}: ${msg.message}`;
      messageList.prepend(newmessage);
    }
  });
});
socket.on("serror", (data) => {
  console.log("server error:" + data);

  serror.innerText = "Server Error(s): " + data;
  setTimeout(() => {
    serror.innerText = " ";
  }, 8 * 1000);
});

let PixelSize = 20;

function singleCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * PixelSize, y * PixelSize, PixelSize, PixelSize);
}

socket.on("fill", (data) => {
  Object.keys(data).forEach((x) => {
    Object.keys(data[x]).forEach((y) => {
      singleCell(x, y, data[x][y].color);
      if (!canvas.hasOwnProperty(x)) {
        canvas[x] = {};
      }
      canvas[x][y] = data[x][y];
    });
  });
});

socket.on("usernames", (data) => {
  usernames = data;

  ulist.textContent = `Users online: ${usernames.join(", ")}`;
});

socket.on("username-replace", (data) => {
  console.log(data);

  usernames[usernames.indexOf(data.before)] = data.after;

  ulist.textContent = `Users online: ${usernames.join(", ")}`;
});

socket.on("username-remove", (data) => {
  try {
    usernames.splice(usernames.indexOf(data), 1);
    ulist.textContent = `Users online: ${usernames.join(", ")}`;
  } catch (error) {}
});

socket.on("username-add", (data) => {
  try {
    usernames.push(data);
    ulist.textContent = `Users online: ${usernames.join(", ")}`;
  } catch (error) {}
});

socket.on("alldata", (data) => {
  console.log(data);
  canvas = data;
  Object.keys(data).forEach((x) => {
    Object.keys(data[x]).forEach((y) => {
      singleCell(x, y, data[x][y].color);
    });
  });
});

socket.on("disconnect", () => {
  document.body.innerHTML = `<h1>openpixels</h1> <p>Sorry, You have been kicked. This could be either from a moderator, or a server shutdown. Thank you!</p>`;
  if (kickreason != "No Reason Given.") {
    let kickelement = document.createElement("p");
    kickelement.innerHTML = `Kick reason: ${kickreason}`;
    document.body.appendChild(kickelement);
  }
});

let StartPanning = false;
let Startingx;
let Startingy;

let zoomLevel = 100;
let Zoom = 1;

canvasElm.addEventListener("wheel", (e) => {
  e.preventDefault(); // Prevent scrolling
  e.stopPropagation();

  //canvasElm.style.zoom = Zoom;

  var laterpixsize = PixelSize - e.deltaY / 50;

  console.log(laterpixsize);

  if (laterpixsize < 5.5) {
    return;
  }
  if (laterpixsize * 500 > 15000) {
    return;
  }

  PixelSize -= e.deltaY / 50;

  // ctx.save();
  // ctx.translate(canvasElm.width / 2, canvasElm.height / 2);
  // // ctx.scale(PixelSize / 20, PixelSize / 20);

  // ctx.clearRect(0, 0, canvasElm.width, canvasElm.height);

  // console.log(canvas);
  // Object.keys(canvas).forEach((x) => {
  //   Object.keys(canvas[x]).forEach((y) => {
  //     // singleCell(x, y, canvas[x][y].color);
  //     ctx.fillStyle = canvas[x][y].color;
  //     ctx.fillRect(x * PixelSize, y * PixelSize, PixelSize, PixelSize);
  //   });
  // });

  // ctx.restore();

  // let boundingrect = canvasElm.getBoundingClientRect();

  // let x = e.screenX - boundingrect.left;
  // let y = e.screenY - boundingrect.top;

  canvasElm.height = PixelSize * 300;
  canvasElm.width = PixelSize * 300;

  ctx.clearRect(0, 0, canvasElm.width, canvasElm.height);
  Object.keys(canvas).forEach((x) => {
    Object.keys(canvas[x]).forEach((y) => {
      singleCell(x, y, canvas[x][y].color);
    });
  });

  // window.scrollBy(x, y);
});

canvasElm.addEventListener("mousedown", (e) => {
  if (e.button == 2) {
    e.preventDefault();
    e.stopPropagation();
    StartPanning = true;
    let boundingrect = canvasElm.getBoundingClientRect();
    Startingx = e.clientX - boundingrect.left;
    Startingy = e.clientY - boundingrect.top;
    document.body.style.cursor = "none";
  }
});

const customMouse = document.getElementById("customMouse");

canvasElm.addEventListener("mousemove", (e) => {
  if (e.button == 2) {
    if (StartPanning) {
      e.preventDefault();
      e.stopPropagation();
      let boundingrect = canvasElm.getBoundingClientRect();
      let x = e.clientX - boundingrect.left;
      let y = e.clientY - boundingrect.top;

      const dx = Startingx - x;
      const dy = Startingy - y;
      window.scrollBy(dx, dy);
    }
  }
});

canvasElm.addEventListener("mouseup", (e) => {
  if (e.button == 2) {
    e.preventDefault();
    e.stopPropagation();
    StartPanning = false;
    document.body.style.cursor = "default";
  }
});

canvasElm.addEventListener("mousedown", (e) => {
  if (e.button != 0 || cooldown >= Date.now() - 400) {
    // prettier-ignore
    if (pickingcolor == 1) {
      try {
        let boundingrect = canvasElm.getBoundingClientRect();
        let x = Math.floor(e.clientX - boundingrect.left);
        let y = Math.floor(e.clientY - boundingrect.top);
        document.getElementById("color").value = canvas[Math.floor(x / PixelSize)][Math.floor(y / PixelSize)].color;
        pickingcolor = 0;
      } catch (_) {
        document.getElementById("color").value = "";
        pickingcolor = 0;
      }
      return;
    } else {
      return;
    }
  }
  let boundingrect = canvasElm.getBoundingClientRect();
  let x = Math.floor(e.clientX - boundingrect.left);
  let y = Math.floor(e.clientY - boundingrect.top);

  // let color = Math.floor(Math.random() * 11);
  let color = document.getElementById("color").value;

  singleCell(Math.floor(x / PixelSize), Math.floor(y / PixelSize), color);

  let senddata = {
    x: Math.floor(x / PixelSize),
    y: Math.floor(y / PixelSize),
    color: color,
  };

  console.log(senddata.x, senddata.y, senddata.color);

  cooldown = Date.now();
  socket.emit("fill", senddata);
});

canvasElm.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  //showing usernames

  let boundingrect = canvasElm.getBoundingClientRect();
  let x = Math.floor(e.clientX - boundingrect.left);
  let y = Math.floor(e.clientY - boundingrect.top);

  try {
    document.getElementById("selectedauthor").textContent = `Filled by ${
      canvas[Math.floor(x / PixelSize)][Math.floor(y / PixelSize)].author
    }`;
  } catch (_) {
    document.getElementById("selectedauthor").textContent = `Filled by nobody`;
    let authorstyle = document.getElementById("authordiv").style;
    authorstyle.position = "absolute";
    authorstyle.left = x + 20 + "px";
    authorstyle.top = y + 20 + "px";
  }

  // let color = canvas[Math.floor(x / 20)][Math.floor(y / 20)].color;
  ctx.strokeStyle = "#000000";
  ctx.strokeRect(
    Math.floor(x / PixelSize) * PixelSize,
    Math.floor(y / PixelSize) * PixelSize,
    PixelSize,
    PixelSize
  );

  let authorstyle = document.getElementById("authordiv").style;
  authorstyle.position = "absolute";
  authorstyle.left = x + 20 + "px";
  authorstyle.top = y + 20 + "px";

  setTimeout(() => {
    document.getElementById("selectedauthor").textContent = ``;
    authorstyle.left = 0;
    authorstyle.top = 0;
    ctx.clearRect(0, 0, canvasElm.width, canvasElm.height);
    Object.keys(canvas).forEach((x) => {
      Object.keys(canvas[x]).forEach((y) => {
        singleCell(x, y, canvas[x][y].color);
      });
    });
  }, 2000);
});

// setInterval(() => {
//   if (cooldown >= Date.now() - 500) {
//     document.getElementById("cooldown").innerText =
//       "Wait 0.4 second(s) before painting!";
//   } else {
//     document.getElementById("cooldown").innerText = "";
//   }
// }, 250);

setTimeout(() => {
  const SavedUsername = localStorage.getItem("Username");
  if (SavedUsername) {
    socket.emit("username", { name: SavedUsername });
  }
}, 300);
