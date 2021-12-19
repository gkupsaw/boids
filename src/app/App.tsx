import React from 'react';
import './App.css';

import { ThreeGame } from '../ThreeGame/ThreeGame';
import { EventSystem } from '../EventSystem/EventSystem';
import { BoidSystem } from '../BoidSystem/BoidSystem';
import { CanvasUtils } from '../CanvasUtils/CanvasUtils';

type AppProps = {};

class App extends React.Component {
    game!: ThreeGame;
    esys!: EventSystem;
    cleanup: (() => void)[];

    constructor(props: AppProps) {
        super(props);

        this.cleanup = [];
    }

    componentDidMount = () => {
        this.game = new ThreeGame();
        // .withUI().withDebug();
        this.esys = new EventSystem(document.body);
        // this.esys = new EventSystem(this.game.getRenderer().domElement);

        // count: 500, particleSize: 0.04, speed: 0.3
        const bsys = new BoidSystem(this.game.getScene(), {
            size: 4,
            count: 500,
            particleSize: 0.08,
            speed: 0.25,
        });
        // .withDebug();
        // .withVisualization();
        const unsubscribeBsysFromEvents = bsys.subscribeToEvents(this.esys);
        this.cleanup.push(unsubscribeBsysFromEvents);
        this.game.addGameObject(bsys);

        this.startGame();
    };

    componentWillUnmount = () => {
        this.game?.dispose();
        this.esys?.dispose();
        this.cleanup.forEach((f) => f());
    };

    startGame = () => {
        this.game?.start(this.esys);
    };

    render() {
        return (
            <div style={{ backgroundColor: ThreeGame.SKY_COLOR }}>
                <canvas
                    id={CanvasUtils.CANVAS_ID}
                    width={document.body.clientWidth}
                    height={document.body.clientHeight}
                />
            </div>
        );
    }
}

export default App;
