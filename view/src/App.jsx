// Styles
import './App.css';

// React Components
import React from 'react';
import Landing from './components/Landing';
import Card from './components/Card';
import Backwards from './components/Backwards';
import Forwards from './components/Forwards';
import Timer from "./components/Timer";
import { Yeah, Nah, Wait} from './components/Buttons';
import Endgame from './components/Endgame';

// Card Data
import cardData from './data/cardData.json';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      meta: {
        room: "0000",
        round: 0,
        turn: 0,
        phase: "setup",
        card: 0,
        score: 0,
        turntime: 0
      },
      history: [],
      players: [],
      hazards: [
        { "id": 1, "class": "A", "symbol": "🚨", "active": 0 },
        { "id": 2, "class": "B", "symbol": "🤮", "active": 0 },
        { "id": 3, "class": "C", "symbol": "☣️", "active": 0 },
        { "id": 4, "class": "D", "symbol": "🥾", "active": 0 },
        { "id": 5, "class": "E", "symbol": "💔", "active": 0 }
      ],
      bonuses: [
        { "id": 0, "symbol": "🥤", "active": false, "value": 0 }
      ]
    };
  }

  yes() {
    if(this.state.meta.phase === "play") {
      let hazardEnd = this.state.hazards.map(h => h.active).filter((active) => active >= 2).length;
      let p = this.state.players.find((x) => x.id === parseInt(sessionStorage.getItem("playerID")));
      if(this.state.meta.round <= 5 && hazardEnd === 0 && (p.active === true || p.active === this.state.meta.turn)){
        this.sendMsg("yeah");
        let yes = document.querySelector('#yes')
        yes.classList.add('visible');
        setTimeout(()=>{
          yes.classList.remove('visible');
        }, 500);
      }
    }
  }

  no(){
    if(this.state.meta.phase === "play") {
      let hazardEnd = this.state.hazards.map(h => h.active).filter((active) => active >= 2).length;
      let p = this.state.players.find((x) => x.id === parseInt(sessionStorage.getItem("playerID")));
      if(this.state.meta.card !== 0 && hazardEnd === 0 && (p.active === true || p.active === this.state.meta.turn)){
        this.sendMsg("nah");
        let no = document.querySelector('#no')
        no.classList.add('visible');
        setTimeout(()=>{
          no.classList.remove('visible');
        }, 500);
      }
    }
  }

  showScores() {
    if(this.state.meta.phase === "play") {
      document.querySelector('#scoreboard').classList.toggle("invisible");
    }
  }

  showHist() {
    if(this.state.meta.phase === "play") {
      let historyList = document.querySelector('.historyList');
      if(historyList.style.visibility === "hidden") {
        historyList.style.visibility = "visible";
      } else {
        historyList.style.visibility = "hidden";
      };
    }
  }

  componentDidMount() {
    // Websocket Connection
    this.ws = new WebSocket('wss://gold.mcteamster.com'); // Prod
    //this.ws = new WebSocket('ws://10.0.0.2'); // Dev

    // Bind Listeners to Buttons
    this.ws.onopen = () => {
      // Join
      let join = document.querySelector('#joinGame');
      join.addEventListener('click', () => {
        let room = document.querySelector("#roomInput");
        let name = document.querySelector("#nameInput");
        if(room.value !== '') {
          document.querySelector("#warning").innerText = "";
          this.sendMsg("enter");
        } else if (name.value !== '') {
          document.querySelector("#warning").innerText = "";
          room.style.display = "block";
          name.style.display = "none";
          document.querySelector("#enterGame").style.display = "none";
          join.innerText = "Enter";
        } else {
          name.style.border = '0.25em solid red';
        }
      });

      // Enter
      let enter = document.querySelector('#enterGame');
      enter.addEventListener('click', () => {
        let name = document.querySelector("#nameInput");
        if (name.value !== '') {
          this.sendMsg("enter");
        } else {
          name.style.border = '0.25em solid red';
        }
      });

      // Start
      document.querySelector('#startGame').addEventListener('click', () => {
        this.sendMsg("start");
      });
      // YES
      document.querySelector('#yes').addEventListener('click', () => {this.yes()});
      // NO
      document.querySelector('#no').addEventListener('click', () => {this.no()});
      // Show Scores
      document.querySelector('#showScore').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showScores();
      });
      // Show History
      document.querySelector('#showHistory').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showHist();
      });

      // Hotkeys
      document.addEventListener('keydown', (e)=>{
        switch(e.key){
          case 'ArrowLeft':
            this.no();
            break;
          case 'ArrowRight':
            this.yes();
            break;
          case 'h':
            this.showHist();
            break;
          case 's':
            this.showScores();
            break;
          default:
            break;
        }
      })
    };

    // Update Game State
    this.ws.onmessage = (msg) => {
      msg = JSON.parse(msg.data);
      switch(msg.meta?.type) {
        case "gameState":
          this.setState(msg);

          // Crawling Animation
          if(msg.meta.phase === "play" || msg.meta.phase === "endgame") {
            let wait = document.querySelector('#wait')
            wait.classList.add('visible');
            setTimeout(()=>{
              wait.classList.remove('visible');
            }, 2000);
          }

          document.querySelectorAll(`#scoreboard li .Player .readyStatus`).forEach(e => e.innerText = ""); // Clear Status Markers
          document.querySelectorAll(".setup").forEach(e => e.style.visibility = (msg.meta.phase === "setup") ? "visible" : "hidden");
          document.querySelectorAll(".play").forEach(e => e.style.visibility = (msg.meta.phase === "play") ? "visible" : "hidden");
          document.querySelectorAll(".endgame").forEach(e => e.style.visibility = (msg.meta.phase === "endgame") ? "visible" : "hidden");
          break;
        case "readyStatus":
          Object.keys(msg.meta.data).forEach(key => {
            if(msg.meta.data[key] === true) {
              document.querySelector(`#scoreboard li .Player #status${key}`).innerText = "✔️";
            }
          });
          break;
        case "secret":
          sessionStorage.setItem("playerID", msg.id);
          sessionStorage.setItem("clientSecret", msg.secret);
          if (msg.id === 1) {
            document.querySelector("#startGame").style.display = "block";
          }
          document.querySelector("#roomInput").style.display = "none";
          document.querySelector("#nameInput").style.display = "none";
          document.querySelector("#enterGame").style.display = "none";
          document.querySelector("#joinGame").style.display = "none";
          break;
        case "rejoin":
          if (sessionStorage.getItem("playerID") === "1") {
            document.querySelector("#startGame").style.display = "block";
          }
          document.querySelector("#roomInput").style.display = "none";
          document.querySelector("#nameInput").style.display = "none";
          document.querySelector("#enterGame").style.display = "none";
          document.querySelector("#joinGame").style.display = "none";
          break;
        case "error":
          console.error(new Date() + msg.meta.data);
          if(msg.meta.code === "missingRoom") {
            document.querySelector("#roomInput").style.border = "0.25em solid red";
            document.querySelector("#warning").innerText = "Invalid Room";
          } else if(msg.meta.code === "takenName") {
            document.querySelector("#nameInput").style.display = "block";
            document.querySelector("#nameInput").style.border = "0.25em solid yellow";
            document.querySelector("#warning").innerText = "Name Already Taken";
          }
          break;
        default:
          break;
      }
    };
  }

  // Send Message
  sendMsg(type) {
    let msg = {
      playerID: sessionStorage.getItem("playerID"),
      clientSecret: sessionStorage.getItem("clientSecret")
    };

    if (this.state.meta.phase === "play") {
      // Signal Intent and update local state in advance
      if (type === "yeah") {
        try {
          let p = this.state.players.find((x) => x.id === parseInt(sessionStorage.getItem("playerID")))
          if (p.active === true || p.active === this.state.meta.turn) {
            p.active = true;
          };
          msg.data = true;
        } catch (err) {
          console.error("Player ID Not Found")
        }
      } else if (type === "nah") {
        try {
          let p = this.state.players.find((x) => x.id === parseInt(sessionStorage.getItem("playerID")))
          if (p.active === true || p.active === this.state.meta.turn) {
            p.active = this.state.meta.turn;
          };
          msg.data = false;
        } catch (err) {
          console.error("Player ID Not Found")
        }
      }
      this.setState(this.state);
    } else if (this.state.meta.phase === "setup") {
      // Set Player Name
      if (type === "enter") {
        let roomInput = document.getElementById("roomInput").value;
        if(roomInput < 10000 && roomInput > 0){
          msg.roomID = Math.floor(roomInput);
        }
        msg.data = document.getElementById("nameInput").value;
      } else if (type === "start") {
        msg.data = "start";
      }
    }
    // Send
    this.ws.send(JSON.stringify(msg));
  }

  render() {
    return (
      <div className="App">
        <Landing players={this.state.players} room={this.state.meta.room}/>
        <Backwards players={this.state.players} meta={this.state.meta} />
        <Card data={cardData[this.state.meta.card]} meta={this.state.meta} />
        <Forwards history={this.state.history} hazards={this.state.hazards} meta={this.state.meta} />
        <Timer turntime={this.state.meta.turntime} hazards={this.state.hazards} cardType={cardData[this.state.meta.card].type}/>
        <Yeah />
        <Nah />
        <Wait state={this.state}/>
        <Endgame players={this.state.players} />
        <div id='showHistory' className="play"><div className="head centered">🕑</div></div>
        <div id='showScore' className="play"><div className="head centered">🏅</div></div>
      </div>
    );
  }
}

export default App;