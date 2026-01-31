import './styles/Endgame.css';
import Player from './Player';

function Endgame(props) {
    const players = props.players.sort((a,b)=> a.name > b.name).sort((a,b)=> a.totalScore < b.totalScore); // Sort By Score, Tiebreak Alphabetically
    const playerList = players.map((player)=>
      (player.active === true) &&
      (<li key={player.id}>
        <Player info={player} score={0} turn={0}/>
      </li>)
    );

    return (
      <div className="Endgame endgame">
        <h1>Final Scores</h1>
        <div className="head">🏆</div>
        <ul className="playerList">
            {playerList}
        </ul>
      </div>
    );
}

export default Endgame;