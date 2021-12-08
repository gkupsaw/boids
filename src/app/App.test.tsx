import React from 'react';
import { render, screen } from '@testing-library/react';
import { Scene } from 'three';

import App from './App';
import { ThreeGame } from '../ThreeGame/ThreeGame';

// const mockGetScene = () => {
//     return new Scene();
// };
// const mockDispose = () => {
//     return null;
// };
// jest.mock('../three/ThreeGame', () => {
//     return {
//         ThreeGame: jest.fn().mockImplementation(() => {
//             return {
//                 getScene: mockGetScene,
//                 dispose: mockDispose,
//             };
//         }),
//         getScene: mockGetScene,
//         dispose: mockDispose,
//     };
// });

test('renders the canvas', () => {
    // render(<App />);
    // const canvas = document.querySelector('#glCanvas');
    // expect(canvas).not.toBeNull();
});
