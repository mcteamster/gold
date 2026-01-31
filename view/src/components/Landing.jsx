import './styles/Landing.css';
import Player from './Player';

function Landing(props) {
    const players = props.players.sort((a,b)=> a.id > b.id) // Sort by ID in the lobby
    const playerList = players.map((player)=>
      (player.active === true) &&
      (<li key={player.id}>
        <Player info={player} score={0}/>
      </li>)
    );

    let lobbyMessage = (props.room) ? `🔑 ${props.room}` : ""

    return (
      <div className="Landing setup">
        <h1>Drinkin' Gold</h1>
        <div id="instructions">
          🎉&nbsp;It's&nbsp;a&nbsp;5&nbsp;day&nbsp;pub&nbsp;crawl! Can&nbsp;you&nbsp;drink&nbsp;the&nbsp;most?<br></br>
          ➡️ Tap right to kick on 👍 and drink more! 🍻<br></br>
          ⬅️ Tap left to bail 👎 or grab a bite on the way home 🍕<br></br>
          ⚠️&nbsp;Watch&nbsp;for&nbsp;hazards! Two&nbsp;strikes&nbsp;end&nbsp;your&nbsp;night&nbsp;🤮
        </div>
        <ul className="playerList" id="lobbyList">
            {playerList}
        </ul>
        <div className="number" id="lobbyMessage">{lobbyMessage}</div>
        <input id="roomInput" className="hidden" type="number" placeholder="Room 🔑" min="1000" max="9999"></input>
        <input id="nameInput" type="text" placeholder="Name 👋" maxLength="12"></input>
        <div id="warning"></div>
        <div id="buttonTray" className="centered">
          <div id="joinGame" className="lobbyButton">Join</div>
          <div id="enterGame" className="lobbyButton">Create</div>
          <div id="startGame" className="lobbyButton hidden">START</div>
        </div>
      </div>
    );
}

export default Landing;