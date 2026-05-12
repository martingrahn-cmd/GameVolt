// Simple 2D physics utilities for X/Z plane
class Vector2D {
    constructor(x = 0, z = 0) {
        this.x = x;
        this.z = z;
    }
    
    add(v) {
        this.x += v.x;
        this.z += v.z;
        return this;
    }
    
    clone() {
        return new Vector2D(this.x, this.z);
    }
    
    length() {
        return Math.sqrt(this.x * this.x + this.z * this.z);
    }
    
    normalize() {
        const len = this.length();
        if (len > 0) {
            this.x /= len;
            this.z /= len;
        }
        return this;
    }
    
    scale(scalar) {
        this.x *= scalar;
        this.z *= scalar;
        return this;
    }
    
    distance(v) {
        const dx = this.x - v.x;
        const dz = this.z - v.z;
        return Math.sqrt(dx * dx + dz * dz);
    }
    
    dot(v) {
        return this.x * v.x + this.z * v.z;
    }
}

// Wrap-around bounds (updated dynamically by camera)
const BOUNDS = {
    minX: -100,
    maxX: 100,
    minZ: -75,
    maxZ: 75,
    updateFromCamera(camera) {
        // Orthographic camera: right/left = X, top/bottom = Z
        this.minX = camera.left;
        this.maxX = camera.right;
        this.minZ = camera.bottom;
        this.maxZ = camera.top;
    }
};

function updateWrapAround(obj) {
    if (obj.position.x > BOUNDS.maxX) obj.position.x = BOUNDS.minX;
    if (obj.position.x < BOUNDS.minX) obj.position.x = BOUNDS.maxX;
    if (obj.position.z > BOUNDS.maxZ) obj.position.z = BOUNDS.minZ;
    if (obj.position.z < BOUNDS.minZ) obj.position.z = BOUNDS.maxZ;
}

// Simple sphere collision
function checkCollision(pos1, radius1, pos2, radius2) {
    const dx = pos1.x - pos2.x;
    const dz = pos1.z - pos2.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    return distance < (radius1 + radius2);
}

// Distance between two objects
function getDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dz * dz);
}
