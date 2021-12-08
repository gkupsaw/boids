import React from 'react';
import './App.css';

import { ThreeGame } from '../ThreeGame/ThreeGame';
import { ParticleSystem } from '../ParticleSystem/ParticleSystem';
import { EventSystem } from '../EventSystem/EventSystem';

type AppProps = {};

class App extends React.Component implements AppProps {
    game: ThreeGame | null;
    psys: ParticleSystem | null;
    esys: EventSystem | null;

    constructor(props: AppProps) {
        super(props);

        this.game = null;
        this.psys = null;
        this.esys = null;
    }

    componentDidMount = () => {
        this.game = new ThreeGame(new EventSystem());

        this.game.addGameObject(new ParticleSystem(this.game.getScene()));

        this.startGame();
    };

    componentWillUnmount = () => {
        this.game?.dispose();
    };

    startGame = () => {
        this.game?.start();
    };

    render() {
        return (
            <div className='App' style={{ backgroundColor: ThreeGame.SKY_COLOR }}>
                <canvas id={ThreeGame.CANVAS_ID} width={1800} height={1200} className='gl-canvas' />
            </div>
        );
    }
}

export default App;
