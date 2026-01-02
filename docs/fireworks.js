class Fireworks {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    launch(winner) {
        // Clear any existing fireworks
        this.container.innerHTML = '';
        
        const colors = ['#ff6b35', '#4caf50', '#ffd700', '#ff1744', '#00e5ff'];
        const particleCount = 100;
        
        // Create multiple firework bursts
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.createBurst(
                    Math.random() * window.innerWidth,
                    Math.random() * window.innerHeight * 0.5,
                    colors[Math.floor(Math.random() * colors.length)],
                    particleCount
                );
            }, i * 200);
        }
        
        // Show winner message
        setTimeout(() => {
            this.showWinnerMessage(winner);
        }, 1000);
    }

    createBurst(x, y, color, particleCount) {
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'firework';
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;
            particle.style.backgroundColor = color;
            
            const angle = (Math.PI * 2 * i) / particleCount;
            const velocity = 5 + Math.random() * 5;
            const vx = Math.cos(angle) * velocity;
            const vy = Math.sin(angle) * velocity;
            
            this.container.appendChild(particle);
            
            let px = x;
            let py = y;
            let opacity = 1;
            let size = 4;
            
            const animate = () => {
                px += vx;
                py += vy;
                vy += 0.2; // gravity
                opacity -= 0.02;
                size -= 0.05;
                
                particle.style.left = `${px}px`;
                particle.style.top = `${py}px`;
                particle.style.opacity = opacity;
                particle.style.width = `${Math.max(0, size)}px`;
                particle.style.height = `${Math.max(0, size)}px`;
                
                if (opacity > 0 && size > 0) {
                    requestAnimationFrame(animate);
                } else {
                    particle.remove();
                }
            };
            
            requestAnimationFrame(animate);
        }
    }

    showWinnerMessage(winner) {
        const message = document.createElement('div');
        message.style.position = 'fixed';
        message.style.top = '50%';
        message.style.left = '50%';
        message.style.transform = 'translate(-50%, -50%)';
        message.style.background = 'linear-gradient(135deg, #ff6b35 0%, #4caf50 100%)';
        message.style.color = 'white';
        message.style.padding = '40px 60px';
        message.style.borderRadius = '20px';
        message.style.fontSize = '3em';
        message.style.fontWeight = 'bold';
        message.style.textAlign = 'center';
        message.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.3)';
        message.style.zIndex = '2000';
        message.style.animation = 'scaleIn 0.5s ease-out';
        message.textContent = `🏆 ${winner} Wins! 🏆`;
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.style.animation = 'scaleOut 0.5s ease-in';
            setTimeout(() => {
                message.remove();
            }, 500);
        }, 3000);
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes scaleIn {
        from {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0;
        }
        to {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
        }
    }
    
    @keyframes scaleOut {
        from {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
        }
        to {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

