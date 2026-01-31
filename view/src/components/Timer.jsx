import React from 'react';
import './styles/Timer.css';

class Timer extends React.Component{
  constructor(props){
    super(props);
    this.state = {
      tunrntime: this.props.tunrntime - 1000, // One Second Buffer
      time: this.turntime
    }
  }

  componentDidMount() {
    setInterval(()=>{
      let t;
      let glass = document.querySelector(".Card");
      if(this.turntime === this.props.turntime - 1000){
        let fullness = 100*this.state.time/this.turntime - 10;
        glass.style.backgroundImage = `linear-gradient(0deg, ${this.color}, ${fullness-1}%, ${this.color}, ${fullness-1}%, beige)`;
        if(this.state.time > 30){
          t = this.state.time - 30;
        } else {
          t = 0;
        }
      } else {
        t = this.props.turntime - 1000;
        this.turntime = t;
        if(this.props.cardType === "hazard") {
          this.hazardMax = Math.max(...(this.props.hazards.map(h => h.active)));
          if(this.hazardMax >= 2){
            this.color = "red";
          } else {
            this.color = "aqua";
          }
        } else if(this.props.cardType === "bonus") {
          this.color = "yellow"
        } else {
          this.color = "goldenrod"
        }
      }
      this.setState({time: t});
    }, 30)
  }

  /*
  formatTime() {
    let clock = this.state.time;
    return `⏰ ${Math.floor(clock/1000)}.${Math.floor((clock%1000)/100)}`;
  }
  */

  render(){
    //let clock = this.formatTime();
    return(
      //<div className="Timer play">{clock}</div>
      <div></div>
    )
  }
}

export default Timer;