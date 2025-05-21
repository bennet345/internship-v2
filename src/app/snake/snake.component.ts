import { Component, HostListener, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServerService } from '../server.service';

function modulo(value: number, x: number): number {
  return ((value % x) + x) % x;
}

class Snake {
  snake: number[][] = [[0, 0], [0, 1], ];
  direction: number[] = [0, 1];
  points: number = 0;

  forward(field: string): boolean {
    let newPosition = this.newPosition();
    let element = this.snake.shift()!;
    let ate = false;
    switch (field) {
      case 'food': {
        ate = true;
        this.points += 1;
        this.snake.unshift(element);
        if (element[0] === newPosition[0] && element[1] === newPosition[1]) {
          this.die();
        }
        break;
      }
      case 'blue':
      case 'red':
      case 'purple': {
        this.die();
        break;
      }
    }
    this.snake.push(newPosition);
    return ate;
  }

  newPosition() {
    return [
      modulo((this.snake[this.snake.length - 1][0] + this.direction[0]), 10),
      modulo((this.snake[this.snake.length - 1][1] + this.direction[1]), 10),
    ];
  }

  die() {
    this.snake = [this.snake[this.snake.length - 1]];
  }

  setDirection(direction: number[]) {
    let current = [
      this.snake[this.snake.length - 1][0] - this.snake[this.snake.length - 2][0],
      this.snake[this.snake.length - 1][1] - this.snake[this.snake.length - 2][1],
    ];
    if (current[0] > 1) current[0] = -1;
    if (current[0] < -1) current[0] = 1;
    if (current[1] > 1) current[1] = -1;
    if (current[1] < -1) current[1] = 1;
    console.log(current);
    if (direction[0] === -current[0] && direction[1] === -current[1]) {
      return;
    }
    this.direction = direction;
  }
}

interface Food {
  position: number[],
  time: number,
}

@Component({
  selector: 'app-snake',
  imports: [FormsModule],
  template: `
    <div class='board'>
      @for (field of grid(); track $index) {
        <span class='field {{ field }}'></span>
        @if (($index + 1) % 10 === 0) { <div></div> }
      }
    </div>
    <div>
      Difficulty
      <input
        type='range'
        min='1' max='100'
        [(ngModel)]='difficulty'
      />
    </div>
    @if (server.score !== undefined) {
      <div>Score: {{ server.score }}</div>
    }
    <div>
      <span style='color: blue;'>{{ this.snakes[0].points }}</span>
      <span style='color: red;'>{{ this.snakes[1].points }}</span>
    </div>
  `,
  styles: `
    .board {
      font-size: 0;
    }

    .field {
      display: inline-block;
      width: 30px;
      height: 30px;
    }

    .red  { background-color: red; }
    .blue { background-color: blue; }
    .purple { background-color: purple; }
    .food   { background-color: green; }
    .empty  { background-color: rgb(64, 128, 255); }
  `
})
export class SnakeComponent {
  server: ServerService = inject(ServerService);
  snakes: Snake[] = [new Snake(), new Snake()];
  food: Food[] = [];
  difficulty: number = 50;

  async ngOnInit() {
    let iteration = 0;
    while (true) {
      for (let snake of this.snakes) {
        let field = snake.newPosition();
        let ate = snake.forward(this.gridPosition(field[0], field[1]));
        if (ate) {
          let newPosition = snake.snake[snake.snake.length - 1];
          for (let i = 0; i < this.food.length; i++) {
            if (this.food[i].position[0] === newPosition[0] && this.food[i].position[1] === newPosition[1]) {
              this.food.splice(i, 1);
              break;
            }
          }
          this.server.incrementScore();
        }
      }
      if (iteration % 5 === 0) {
        this.food.push({
          position: this.unoccupiedPosition(),
          time: iteration,
        });
      }
      for (let i = 0; i < this.food.length; i++) {
        let reverse = this.food.length - i - 1;
        if (iteration - this.food[reverse].time >= 25) {
          this.food.splice(reverse, 1);
        }
      }
      iteration += 1;
      await new Promise(resolve => setTimeout(resolve, 400 - this.difficulty * 3));
    }
  }

  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    switch (event.key) {
      case 'w': { this.snakes[0].setDirection([0, -1]); break; }
      case 's': { this.snakes[0].setDirection([0, 1]);  break; }
      case 'd': { this.snakes[0].setDirection([1, 0]);  break; }
      case 'a': { this.snakes[0].setDirection([-1, 0]); break; }
      case 'i': { this.snakes[1].setDirection([0, -1]); break; }
      case 'k': { this.snakes[1].setDirection([0, 1]);  break; }
      case 'l': { this.snakes[1].setDirection([1, 0]);  break; }
      case 'j': { this.snakes[1].setDirection([-1, 0]); break; }
    }
  }

  unoccupiedPosition(): number[] {
    while (true) {
      let position = [Math.floor(Math.random() * 10), Math.floor(Math.random() * 10)];
      if (this.gridPosition(position[0], position[1]) === 'empty') return position;
    }
  }

  grid(): string[] {
    let output: string[] = [];
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        output.push(this.gridPosition(x, y));
      }
    }
    return output;
  }

  gridPosition(x: number, y: number): string {
      let occupied = 0;
      let i = 0;
      for (let snake of this.snakes) {
        i += 1;
        for (let part of snake.snake) {
          if (part[0] === x && part[1] === y) {
            occupied += i;
          }
        }
      }
      if (occupied === 1) return 'blue';
      if (occupied === 2) return 'red';
      if (occupied === 3) return 'purple';
      for (let food of this.food) {
        if (food.position[0] === x && food.position[1] === y) {
          return 'food';
        }
      }
      return 'empty';
  }
}
