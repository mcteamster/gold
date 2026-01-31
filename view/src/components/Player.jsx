import './styles/Player.css';

function Player(props) {
  let score = props.score;
  let turn = props?.turn;
  if(props.info.active !== true && props.info.active !== turn) {
    score = 0;
  }
  let percent = 100*(props.info.totalScore/(props.info.totalScore + score));
  let width = 0.1*(props.info.totalScore + score);
  let color = (parseInt(sessionStorage.getItem("playerID")) === parseInt(props.info.id)) ? "forestgreen" : "darkslateblue";

  let style = {
    width: `${width}em`,
    minWidth: "1.5em",
    borderRadius: "25vw 2vw 25vw 2vw/2vw 25vw 2vw 25vw",
    backgroundColor: props.info.colour,
    backgroundImage: `linear-gradient(90deg, ${props.info.colour}, ${percent}%, ${props.info.colour}, ${percent}%, rgba(255,255,255,0.66))` 
  }

  let nameStyle = {
    color: color
  }

  return (
    <div className="Player">
      <div className="meeple centered number" style={style}>{props.info.totalScore+score}</div>
      <div style={nameStyle}>{props.info.name}&nbsp;<span id={`status${props.info.id}`} className="readyStatus"></span></div>
    </div>
  );
}

export default Player;