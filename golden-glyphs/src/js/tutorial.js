// src/js/tutorial.js
// Tutorial med hand, pil, och dynamisk text - "for dummies" edition

import { SHAPES } from './config.js';

export class Tutorial {
    constructor(canvas, grid) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.grid = grid;
        
        this.active = false;
        this.pieces = [];
        this.solution = [];
        
        // Aktuell instruktion
        this.instruction = null; // 'ROTATE', 'FLIP', 'DRAG'
        this.currentPiece = null; // Biten som behöver hjälp
        this.targetCol = 0;
        this.targetRow = 0;
        
        // Animation
        this.timer = 0;
        this.handPos = { x: 0, y: 0 };
    }

    init(pieces, solution) {
        this.pieces = pieces;
        this.solution = solution;
        this.active = true;
    }

    hide() {
        this.active = false;
        this.instruction = null;
        this.currentPiece = null;
    }

    // Hämta target shape från SHAPES config med rotation och flip
    getTargetShape(shapeKey, rotation, flipped) {
        const original = SHAPES[shapeKey];
        if (!original) return [];
        
        let shape = original.map(p => [...p]);
        
        // Applicera flip FÖRST
        if (flipped) {
            shape = shape.map(([c, r]) => [-c, r]);
        }
        
        // Sedan rotation
        for (let i = 0; i < rotation; i++) {
            shape = shape.map(([c, r]) => [-r, c]);
        }
        
        return shape;
    }

    // Jämför två uppsättningar celler
    cellsMatch(cells1, cells2) {
        if (cells1.length !== cells2.length) return false;
        
        const sort = (cells) => [...cells].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        const s1 = sort(cells1);
        const s2 = sort(cells2);
        
        return s1.every((c, i) => c[0] === s2[i][0] && c[1] === s2[i][1]);
    }

    // Kolla om en bit är korrekt placerad på rätt celler
    isPieceCorrectlyPlaced(piece, sol) {
        if (!piece || !piece.isPlaced) return false;
        
        // Beräkna vilka celler biten faktiskt täcker
        const actualCells = piece.shape.map(([c, r]) => [piece.col + c, piece.row + r]);
        
        // Beräkna vilka celler lösningen kräver
        const targetShape = this.getTargetShape(sol.key, sol.rotation, sol.flipped);
        const targetCells = targetShape.map(([c, r]) => [sol.col + c, sol.row + r]);
        
        return this.cellsMatch(actualCells, targetCells);
    }

    // Returnerar hint-data för nästa bit som behöver hjälp
    getHintForNextPiece() {
        if (!this.active || !this.pieces || !this.solution) return null;

        // Loopa genom solution i ordning
        for (let i = 0; i < this.solution.length; i++) {
            const sol = this.solution[i];
            
            // Hitta biten med matchande shapeKey
            const piece = this.pieces.find(p => p.shapeKey === sol.key);
            if (!piece) continue;
            
            // Kolla om biten redan är korrekt placerad
            if (this.isPieceCorrectlyPlaced(piece, sol)) {
                continue; // Denna bit är klar, gå till nästa
            }
            
            // Denna bit behöver hjälp!
            this.currentPiece = piece;
            this.targetCol = sol.col;
            this.targetRow = sol.row;
            
            const currentRotation = (piece.rotation || 0) % 4;
            const targetRotation = (sol.rotation || 0) % 4;
            const needsRotate = currentRotation !== targetRotation;
            const needsFlip = piece.flipped !== sol.flipped;
            
            // Prioritet: ROTATE först, sedan FLIP, sist DRAG
            if (needsRotate) {
                this.instruction = 'ROTATE';
            } else if (needsFlip) {
                this.instruction = 'FLIP';
            } else {
                this.instruction = 'DRAG';
            }
            
            // Returnera hint för VAR biten ska ligga
            const targetShape = this.getTargetShape(sol.key, sol.rotation, sol.flipped);
            
            return {
                key: sol.key,
                col: sol.col,
                row: sol.row,
                shape: targetShape
            };
        }
        
        // Alla bitar är klara!
        this.instruction = null;
        this.currentPiece = null;
        return null;
    }

    update(dt) {
        if (!this.active) return;
        this.timer += dt;
    }

    // Rita allt: text vid biten, hand, och pil
    draw() {
        if (!this.active || !this.instruction || !this.currentPiece) return;
        
        const ctx = this.ctx;
        const piece = this.currentPiece;
        
        // Bitens position
        const pieceX = piece.visualX;
        const pieceY = piece.visualY;
        
        // Target position på griden
        const targetX = this.grid.originX + this.targetCol * this.grid.pitch;
        const targetY = this.grid.originY + this.targetRow * this.grid.pitch;
        
        // Animation timing
        const loopTime = 2.5;
        const t = (this.timer % loopTime) / loopTime;
        
        // Pulserande alpha för text
        const pulse = (Math.sin(this.timer * 4) + 1) / 2;
        const textAlpha = 0.8 + (pulse * 0.2);
        
        // 1. RITA PIL (om DRAG)
        if (this.instruction === 'DRAG') {
            this.drawArrow(ctx, pieceX, pieceY, targetX, targetY);
            this.drawHand(ctx, pieceX, pieceY, targetX, targetY, t);
        }
        
        // 2. RITA TEXT VID BITEN
        ctx.save();
        ctx.globalAlpha = textAlpha;
        ctx.font = `900 24px 'Cinzel', serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        
        let text = "";
        let color = "#FFD700";
        
        if (this.instruction === 'ROTATE') {
            text = "TAP TO ROTATE";
            color = "#00FFFF";
        } else if (this.instruction === 'FLIP') {
            text = "DOUBLE TAP TO FLIP";
            color = "#FF00FF";
        } else if (this.instruction === 'DRAG') {
            text = "DRAG TO PLACE";
            color = "#FFD700";
        }
        
        // Position: Ovanför biten (tillräckligt högt så det alltid syns)
        const textY = pieceY - 80;

        // Outline
        ctx.lineWidth = 5;
        ctx.strokeStyle = "black";
        ctx.strokeText(text, pieceX, textY);
        
        // Fill
        ctx.fillStyle = color;
        ctx.fillText(text, pieceX, textY);
        
        ctx.restore();
        
        // 3. RITA HAND (om ROTATE eller FLIP)
        if (this.instruction === 'ROTATE' || this.instruction === 'FLIP') {
            this.drawTapHand(ctx, pieceX, pieceY, t);
        }
    }
    
    // Rita streckad pil från bit till mål
    drawArrow(ctx, x1, y1, x2, y2) {
        ctx.save();
        ctx.globalAlpha = 0.8;
        
        const dx = x2 - x1;
        const dy = y2 - y1;
        const angle = Math.atan2(dy, dx);
        
        // Streckad linje med animation
        ctx.strokeStyle = "#FFD700";
        ctx.lineWidth = 4;
        ctx.setLineDash([12, 8]);
        ctx.lineDashOffset = -this.timer * 60; // Animerad
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        
        // Pilhuvud
        ctx.setLineDash([]);
        ctx.fillStyle = "#FFD700";
        ctx.beginPath();
        ctx.translate(x2, y2);
        ctx.rotate(angle);
        ctx.moveTo(0, 0);
        ctx.lineTo(-20, -12);
        ctx.lineTo(-20, 12);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
    
    // Rita hand som drar (för DRAG)
    drawHand(ctx, x1, y1, x2, y2, t) {
        ctx.save();
        
        let handX, handY, alpha, scale, touching;
        
        if (t < 0.1) { // Fade in vid start
            handX = x1;
            handY = y1;
            alpha = t / 0.1;
            scale = 1.1;
            touching = false;
        } else if (t < 0.7) { // Dra mot mål
            const dragT = (t - 0.1) / 0.6;
            const smooth = dragT * dragT * (3 - 2 * dragT); // Ease
            handX = x1 + (x2 - x1) * smooth;
            handY = y1 + (y2 - y1) * smooth;
            alpha = 1.0;
            scale = 1.0;
            touching = true;
        } else { // Fade ut
            handX = x2;
            handY = y2;
            alpha = 1.0 - ((t - 0.7) / 0.3);
            scale = 1.0;
            touching = false;
        }
        
        this.drawHandShape(ctx, handX, handY, alpha, scale, touching, "#FFD700");
        ctx.restore();
    }
    
    // Rita hand som tappar (för ROTATE/FLIP)
    drawTapHand(ctx, x, y, t) {
        ctx.save();
        
        let alpha, scale, touching;
        const isDoubleTap = this.instruction === 'FLIP';
        
        if (isDoubleTap) {
            // Dubbeltap animation
            if (t < 0.1) { // In
                alpha = t / 0.1; scale = 1.2; touching = false;
            } else if (t < 0.2) { // Tap 1 ner
                alpha = 1; scale = 0.9; touching = true;
            } else if (t < 0.3) { // Tap 1 upp
                alpha = 1; scale = 1.1; touching = false;
            } else if (t < 0.4) { // Tap 2 ner
                alpha = 1; scale = 0.9; touching = true;
            } else if (t < 0.5) { // Tap 2 upp
                alpha = 1; scale = 1.1; touching = false;
            } else { // Fade ut
                alpha = 1.0 - ((t - 0.5) / 0.5);
                scale = 1.1; touching = false;
            }
        } else {
            // Enkeltap animation
            if (t < 0.15) { // In
                alpha = t / 0.15; scale = 1.2; touching = false;
            } else if (t < 0.35) { // Tap ner
                alpha = 1; scale = 0.9; touching = true;
            } else if (t < 0.55) { // Håll
                alpha = 1; scale = 0.9; touching = true;
            } else if (t < 0.7) { // Släpp
                alpha = 1; scale = 1.2; touching = false;
            } else { // Fade ut
                alpha = 1.0 - ((t - 0.7) / 0.3);
                scale = 1.1; touching = false;
            }
        }
        
        const color = isDoubleTap ? "#FF00FF" : "#00FFFF";
        this.drawHandShape(ctx, x, y - 30, alpha, scale, touching, color);
        ctx.restore();
    }
    
    // Rita handform
    drawHandShape(ctx, x, y, alpha, scale, touching, ringColor) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        
        // Hand
        ctx.fillStyle = "white";
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(12, 12);
        ctx.lineTo(7, 40);
        ctx.lineTo(-7, 40);
        ctx.lineTo(-12, 12);
        ctx.closePath();
        
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.stroke();
        
        // Touch-ring
        if (touching) {
            ctx.beginPath();
            ctx.arc(0, 0, 25, 0, Math.PI * 2);
            ctx.strokeStyle = ringColor;
            ctx.lineWidth = 4;
            ctx.stroke();
            
            // Touch-punkt
            ctx.fillStyle = "rgba(255,255,255,0.9)";
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}