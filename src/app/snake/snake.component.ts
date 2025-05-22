import { Component, HostListener, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServerService } from '../server.service';

function modulo(value: number, x: number): number {
  return ((value % x) + x) % x;
}

interface InitialSnake {
  position: number[],
  color: number[],
  keys: string[],
}

class Snake {
  id: number;
  snake: number[][];
  direction: number[] = [0, 1];
  points: number = 0;
  color: number[];
  onDeath: (n: number) => void;
  keys: string[];

  constructor(id: number, position: number[], color: number[], keys: string[], onDeath: (n: number) => void) {
    this.id = id;
    this.snake = [position, [position[0] + this.direction[0], position[1] + this.direction[1]]];
    this.color = color;
    this.onDeath = onDeath;
    this.keys = keys;
  }

  forward(field: string, dimensions: number[]): boolean {
    let newPosition = this.newPosition(dimensions);
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
      case 'empty': break;
      default: {
        this.die();
        break;
      }
    }
    this.snake.push(newPosition);
    return ate;
  }

  newPosition(dimensions: number[]) {
    return [
      modulo((this.snake[this.snake.length - 1][0] + this.direction[0]), dimensions[0]),
      modulo((this.snake[this.snake.length - 1][1] + this.direction[1]), dimensions[1]),
    ];
  }

  die() {
    this.snake = [this.snake[this.snake.length - 1]];
    this.onDeath(this.id);
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
    if (direction[0] === -current[0] && direction[1] === -current[1]) {
      return;
    }
    this.direction = direction;
  }

  controller(input: string) {
    for (let i = 0; i < 4; i++) {
      if (input === this.keys[i]) this.setDirection(
        [[0, -1], [0, 1], [1, 0], [-1, 0]][i]);
    }
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
        @if (field === 'food' || field === 'empty') {
          <span class='field {{ field }}'></span>
        } @else {
          <span class='field' style='{{ field }}'></span>
        }
        @if (($index + 1) % dimensions[0] === 0) { <div></div> }
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
      @for (snake of this.snakes; track $index) {
        <span style='color: rgb({{ snake.color[0] }}, {{ snake.color[1] }}, {{ snake.color[2] }});'>
          {{ this.snakes[0].points }}
        </span>
      }
    </div>
    <button (click)='snakeSetup()'>restart</button>
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

    .food   { background-color: green; }
    .empty  { background-color: rgb(64, 128, 255); }
  `
})
export class SnakeComponent {
  dimensions: number[] = [15, 15];
  server: ServerService = inject(ServerService);
  onDeath: (n: number) => void = (n: number) => this.kill(n);
  initialSnakes: InitialSnake[] = [
    { position: [0, 0], color: [255, 0, 0], keys: ['w', 's', 'd', 'a']},
    { position: [5, 5], color: [0, 0, 255], keys: ['i', 'k', 'l', 'j']},
    { position: [7, 7], color: [255, 255, 0], keys: ['t', 'g', 'h', 'f']},
  ];
  snakes: Snake[] = [];
  food: Food[] = [];
  difficulty: number = 50;

  snakeSetup() {
    this.snakes = [];
    let id = 0;
    for (let snake of this.initialSnakes) {
      this.snakes.push(new Snake(id, snake.position, snake.color, snake.keys, this.onDeath));
      id += 1;
    }
  }

  async ngOnInit() {
    this.snakeSetup();
    let iteration = 0;
    while (true) {
      for (let snake of this.snakes) {
        let field = snake.newPosition(this.dimensions);
        let ate = snake.forward(this.gridPosition(field[0], field[1]), this.dimensions);
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

  kill(id: number) {
    let i = 0;
    for (let snake of this.snakes) {
      if (snake.id === id) {
        this.snakes.splice(i, 1);
        break;
      }
      i += 1;
    }
  }

  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    for (let snake of this.snakes) snake.controller(event.key);
  }

  unoccupiedPosition(): number[] {
    while (true) {
      let position = [Math.floor(Math.random() * this.dimensions[0]), Math.floor(Math.random() * this.dimensions[1])];
      if (this.gridPosition(position[0], position[1]) === 'empty') return position;
    }
  }

  grid(): string[] {
    let output: string[] = [];
    for (let y = 0; y < this.dimensions[1]; y++) {
      for (let x = 0; x < this.dimensions[0]; x++) {
        output.push(this.gridPosition(x, y));
      }
    }
    return output;
  }

  gridPosition(x: number, y: number): string {
      let count = 0;
      let colorSum = [0, 0, 0];
      for (let snake of this.snakes) {
        for (let part of snake.snake) {
          if (part[0] === x && part[1] === y) {
            count += 1;
            colorSum[0] += snake.color[0];
            colorSum[1] += snake.color[1];
            colorSum[2] += snake.color[2];
          }
        }
      }
      if (count > 0) {
        let r = Math.floor(colorSum[0] / count);
        let g = Math.floor(colorSum[1] / count);
        let b = Math.floor(colorSum[2] / count);
        return `background-color: rgb(${r}, ${g}, ${b});`;
      }
      for (let food of this.food) {
        if (food.position[0] === x && food.position[1] === y) {
          return 'food';
        }
      }
      return 'empty';
  }
}
