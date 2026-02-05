"use client";

import styles from "./MoonLitBackground.module.css";

export function MoonLitBackground() {
    return (
        <div className={styles.container}>
            {/* The Drawing Section */}
            <div className={styles.drawing}>
                <div className={styles.noise}></div>
                <div className={styles.center}>
                    <div className={styles.circle}></div>
                </div>
            </div>
        </div>
    );
}
