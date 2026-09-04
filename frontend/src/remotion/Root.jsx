
import React from 'react';
import { Composition } from 'remotion';
import { CinematicComposition } from './CinematicComposition';

export const RemotionRoot = () => {
    return (
        <>
            <Composition
                id="CinematicMemory"
                component={CinematicComposition}
                durationInFrames={300} // Default, will require override prop
                fps={30}
                width={1920}
                height={1080}
            />
        </>
    );
};
