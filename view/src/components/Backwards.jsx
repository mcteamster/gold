import './styles/Backwards.css';
import Player from './Player';

function Backwards(props) {
  const players = props.players.sort((a,b)=> a.name > b.name).sort((a,b)=> {
    let score1 = a.totalScore+((a.active !== true && (a.active !== props.meta.turn) ? 0 : props.meta.score));
    let score2 = b.totalScore+((b.active !== true && (b.active !== props.meta.turn) ? 0 : props.meta.score));
    return score1 < score2
  }); // Sort By Score, Tiebreak Alphabetically
  const playerList = players.map((player)=>
    (<li key={player.id} className={(player.active === true || player.active === props.meta.turn) ? '' : 'grey'}>
      <Player info={player} score={props.meta.score} turn={props.meta.turn} />
    </li>)
  );

  return (
    <div className="Backwards play">
      <ul className="playerList" id="scoreboard">
        {playerList}
      </ul>
    </div>
  );
}

export default Backwards;