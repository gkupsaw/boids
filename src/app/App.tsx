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
        this.game = new ThreeGame();
        this.psys = new ParticleSystem(this.game.getScene());

        this.startGame();
    };

    componentWillUnmount = () => {
        this.game?.dispose();
        this.psys?.dispose();
    };

    startGame = () => {
        let isRendering = false,
            prevElapsed = 0,
            prevTick = 0;

        const render = (elapsed: number) => {
            if (this.esys?.isPaused()) {
                prevElapsed = 0;
                isRendering = false;
                return;
            }

            // convert to seconds
            elapsed /= 1000;

            const tick = elapsed - prevElapsed;

            this.psys?.render(elapsed, tick, prevElapsed, prevTick);
            this.game?.render(elapsed, tick);

            prevElapsed = elapsed;
            prevTick = tick;

            requestAnimationFrame((time) => render(time));
        };

        const play = () => {
            if (isRendering) {
                throw new Error('Attempted to initiate multiple render loops.');
            }
            isRendering = true;
            requestAnimationFrame(render);
        };

        this.esys = new EventSystem(play);
        this.esys.play();
    };

    render() {
        return (
            <div className='App' style={{ backgroundColor: ThreeGame.SKY_COLOR }}>
                <canvas id={ThreeGame.CANVAS_ID} width={800} height={800} className='gl-canvas' />
            </div>
        );
    }
}

export default App;
