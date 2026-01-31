import './styles/Forwards.css';
import Hazards from './Hazards';

function Forwards(props) {
  const historyList = props.history.map((turn)=>
    (<li key={`${turn.drawnTurn}`}>
      <Turn data={turn} meta={props.meta} />
    </li>)
  );

   return (
    <div className="Forwards play">
      <div className="head mobileInvis">🕑</div>
      <ul className="historyList">
        {historyList}
      </ul>
      <Hazards info={props.hazards} />
    </div>
  );
}

function Turn(props) {
  return (
    <div className="Turn">
      {props.data.symbol}&nbsp;{props.data.description}
    </div>
  );
}

export default Forwards;