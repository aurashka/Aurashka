import React from 'react';

const DiwaliOverlays: React.FC = () => {
    // These elements are styled via CSS in index.html for positioning
    return (
        <>
            <div id="diwali-header-overlay" aria-hidden="true"></div>
            <div id="header-garland-overlay" aria-hidden="true"></div>
            <div id="diwali-section-bg-top" aria-hidden="true"></div>
            <div id="diwali-footer-overlay" aria-hidden="true"></div>
        </>
    );
};

export default DiwaliOverlays;