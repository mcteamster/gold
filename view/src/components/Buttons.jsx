import './styles/Buttons.css';

function Yeah() {
  return (
    <div className="Yeah centered invisible" id="yes">
      <b>YEAH!👍<br></br><br></br><br></br></b>
    </div>
  );
}

function Nah() {
  return (
    <div className="Nah centered invisible" id="no">
      <b><br></br><br></br>nah.👎</b>
    </div>
  );
}

function Wait(props) {
  let icon;
  let message;
  if(props.state.meta.phase === "play") {
    let p = props.state.players.find((x) => x.id === parseInt(sessionStorage.getItem("playerID")))
    let hazardEnd = props.state.hazards.map(h => h.active).filter((active) => active >= 2).length;
    if (p.active === true && props.state.meta.card !== 0) {
      let rng = Math.floor(Math.random()*10);
      switch (rng) {
        case 0:
          message = "Kickin' On!";
          icon = "🏃";
          break;
        case 1:
          message = "Kickin' On!";
          icon = "🚂";
          break;
        case 2:
          message = "Kickin' On!";
          icon = "🚖";
          break;
        case 3:
          message = "Kickin' On!";
          icon = "🚲";
          break;
        case 4:
          message = "Kickin' On!";
          icon = "🐎";
          break;
        case 5:
          message = "Kickin' On!";
          icon = "🛴";
          break;
        case 6:
          message = "Kickin' On!";
          icon = "🛹";
          break;
        case 7:
          message = "Kickin' On!";
          icon = "✈️";
          break;
        case 8:
          message = "Kickin' On!";
          icon = "🚀";
          break;
        case 9:
          message = "Kickin' On!";
          icon = "⛴";
          break;
        default:
          break;
      }
    } else if(hazardEnd !== 0 && p.active === false) {
      message = "REKT'";
      icon = "😵";
    } else if(props.state.meta.card === 0) {
      message = "Here we go again...";
      icon = "😂";
    } else {
      message = "Snoozin'";
      icon = "😴";
    }
  } else if(props.state.meta.phase === "endgame"){
    message = "Ending the sesh...";
    icon = "🏠";
  }

  return (
    <div className="Wait centered invisible" id="wait">
      <b>{message}&nbsp;{icon}</b>
    </div>
  );
}

export { Yeah, Nah, Wait };