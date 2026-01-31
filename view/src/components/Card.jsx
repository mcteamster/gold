import './styles/Card.css';

function Card(props) {
    return (
        <div className="Card play">
            <div className="number centered" id="stats">
                <div>🌙&nbsp;{props.meta.round} of 5</div>
                <div>🔑&nbsp;{props.meta.room}</div>
            </div>
            <div id="image" className="centered">{props.data.symbol}</div>
            <Title text={props.data.title} />
            <div className="centered" id="score"><span className="number">{props.meta.score}&nbsp;🍻</span>&nbsp;tonight</div>
            <FlavourText text={props.data.description} />
        </div>
    );
}

function Title(props) {
    return (
        <div className="Title centered">
            {props.text}
        </div>
    )
}

function FlavourText(props) {
    return (
        <div className="FlavourText centered">
            <p>
                {props.text}
            </p>
        </div>
    );
}

export default Card;