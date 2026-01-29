import os
import time
import random
import sys

# Game Configuration
WIDTH = 40
HEIGHT = 15
FPS = 15

# Milia (Player)
class Player:
    def __init__(self):
        self.y = HEIGHT - 2
        self.velocity = 0
        self.is_jumping = False

    def jump(self):
        if not self.is_jumping:
            self.velocity = -2
            self.is_jumping = True

    def update(self):
        self.y += self.velocity
        if self.is_jumping:
            self.velocity += 0.5
            if self.y >= HEIGHT - 2:
                self.y = HEIGHT - 2
                self.is_jumping = False
                self.velocity = 0

# Obstacle
class Obstacle:
    def __init__(self):
        self.x = WIDTH - 1
        self.char = "X"

    def update(self, speed):
        self.x -= speed

def draw(player, obstacles, score):
    screen = [[" " for _ in range(WIDTH)] for _ in range(HEIGHT)]
    
    # Draw floor
    for x in range(WIDTH):
        screen[HEIGHT-1][x] = "="
    
    # Draw Player (Milia)
    screen[int(player.y)][5] = "M"
    
    # Draw Obstacles
    for obs in obstacles:
        if 0 <= obs.x < WIDTH:
            screen[HEIGHT-2][int(obs.x)] = obs.char
            
    # Clear terminal
    os.system('cls' if os.name == 'nt' else 'clear')
    
    print(f"--- MILIA TERMINAL RUNNER ---  SCORE: {score}")
    for row in screen:
        print("".join(row))
    print("Press [Enter] to Jump! (CTRL+C to quit)")

def main():
    player = Player()
    obstacles = []
    score = 0
    speed = 1
    frame = 0
    
    import threading
    
    # Non-blocking input handling
    def input_thread():
        while True:
            input()
            player.jump()

    t = threading.Thread(target=input_thread, daemon=True)
    t.start()

    try:
        while True:
            frame += 1
            if frame % 20 == 0:
                obstacles.append(Obstacle())
            
            player.update()
            
            for obs in obstacles[:]:
                obs.update(speed)
                if obs.x < 0:
                    obstacles.remove(obs)
                    score += 1
                    if score % 5 == 0:
                        speed += 0.1
                
                # Collision check
                if obs.x == 5 and int(player.y) == HEIGHT - 2:
                    print("\nGAME OVER!")
                    print(f"Final Score: {score}")
                    return

            draw(player, obstacles, score)
            time.sleep(1/FPS)
    except KeyboardInterrupt:
        print("\nExit.")

if __name__ == "__main__":
    main()
