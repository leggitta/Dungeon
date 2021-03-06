var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

var counter = 0;
var w = h = 64;

var game_state = "default";
/*
possible game states are ...

- default : default game state
- player_move : player selects location to move
- player_move_animation : animation of player token
- player_attack : player selects target

- enemy_move_animation : animation of enemy token
*/


// active grid square
var active_i;
var active_j;

// helper functions
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------

function vector(x0, y0, x1, y1) {
    // determine distance and angle between two points
    var dx = x1 - x0;
    var dy = y1 - y0;
    var r = Math.pow(Math.pow(dx, 2) + Math.pow(dy, 2), 0.5);
    var phi = Math.atan2(dy, dx)
    return [r, phi];
}
function roll(n) {
    // roll a die
    return Math.floor(Math.random() * n) + 1;
}

// classes
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------

class Tile {
    constructor(i, j) {
        this.i = i;
        this.j = j;
        this.x = i * w;
        this.y = j * h;
        this.r = 0;    // distance
        this.phi = 0;  // angle
    }
    draw() {
        ctx.beginPath();
        ctx.rect(this.x, this.y, w, h);
        
        // default color
        ctx.fillStyle = "gray";
        if (game_state == "player_move") {
            // compute distance to player
            [this.r, this.phi] = vector(player.x, player.y, this.x, this.y);

            // check within player speed
            if (this.r <= player.movement & this.r > 0) {
                ctx.fillStyle = "green";

                // check for active grid
                if (active_i == this.i & active_j == this.j) {
                    ctx.fillStyle = "aquamarine";
                }

                // check for occupied grid
                if (this.i == Math.floor(enemy.x / w) & this.j == Math.floor(enemy.y / h)) {
                    ctx.fillStyle = "gray";
                }
            }
        } else if (game_state == "player_attack") {
            // compute distance to player
            [this.r, this.phi] = vector(player.x, player.y, this.x, this.y);

            // check within player range
            if (this.r <= player.range & this.r > 0) {
                // check for enemy
                if (this.i == Math.floor(enemy.x / w) & this.j == Math.floor(enemy.y / h)) {
                    ctx.fillStyle = "red";
                
                    // check for active grid
                    if (active_i == this.i & active_j == this.j) {
                        ctx.fillStyle = "pink";
                    }
                }
            }
        }
        ctx.fill();
        ctx.stroke();
    }
}

class Map {
    constructor(W, H) {
        this.W = W;
        this.H = H;
        this.tiles = [];

        for (var i = 0; i < this.W; i++) {
            for (var j = 0; j < this.H; j++) {
                var tile = new Tile(i, j)
                this.tiles.push(tile);
            }
        }
    }
    draw() { this.tiles.forEach(tile => tile.draw()); }
}

class Character {
    constructor(name, i, j) {
        this.name = name;
        this.i = i;
        this.j = j;
        this.x = i * w;
        this.y = j * h;
        this.w = w;
        this.h = h;
        this.img = new Image();
        this.img.src = "assets/" + name + ".png";
        this.speed = 30 / 5 * w;
        this.range = 9 / 5 * w;

        // turn specific properties
        this.has_action = true;        // does the character have an action this turn?
        this.has_bonus_action = true;  // does the character have a bonus action this turn?
        this.movement = this.speed;    // remaining movement this turn

        // used to animate movement
        this.destination_x = -1;
        this.destination_y = -1;

        // animation loop
        this.loop = [3, 4];
        this.current_frame = 0;

        // game stats
        this.armor_class = 10;
        this.hit_points = 4;
    }
    draw() {
        // draw current frame
        ctx.drawImage(
            this.img,
            // sprite sheet coordinates
            this.w * this.loop[this.current_frame],
            0, 
            this.w,
            this.h,
            // game coordinates
            this.x,
            this.y,
            this.w,
            this.h
        )

        // advance to next frame
        if (counter % 10 == 0) {
            this.current_frame += 1;
            // console.log('next frame');

            if (this.current_frame >= this.loop.length) {
                // console.log('reset loop', this.loop, game_state);

                // reset frame index
                this.current_frame = 0;

                // advance state (for end of animation sequence)
                if (game_state == "player_attack_animation" & this.name == "player") {
                    this.loop = [3, 4];
                    game_state = "default";
                    // console.log('end player attack animation');
                } else if (game_state == "enemy_attack_animation" & this.name == "enemy") {
                    this.loop = [3, 4];
                    game_state = "default";
                    // console.log('end player attack animation');
                }
            }
        }
    }
    move(i, j) {
        // compute distance to destination
        var [r, phi] = vector(this.x, this.y, i*w, j*h);

        // check for occupied square 
        if (i == Math.floor(enemy.x / w) & j == Math.floor(enemy.y / h)) {
            console.log("Occupied square");
        }
        // check against remaining movement
        else if (r <= this.movement & r > 0) {
            this.movement -= r;
            this.destination_x = i * w;
            this.destination_y = j * h;
        }
    }
    animate_move(next_state) {
        // animate movement toward destination
        var [r, phi] = vector(this.x, this.y, this.destination_x, this.destination_y);
        var dx = 10 * Math.cos(phi);
        var dy = 10 * Math.sin(phi);
        this.x += dx;
        this.y += dy;
        if (r < 5) {
            this.x = this.destination_x;
            this.y = this.destination_y;
            game_state = next_state;
        }
        // update coordinates in grid space
        this.i = Math.floor(this.x / w);
        this.j = Math.floor(this.y / h);
    }
    attack(target, next_state) {
        // expend action (note: this will fail for multi-attack)
        this.use_action();

        // attack the target
        var attack_roll = roll(20);
        console.log(attack_roll);

        // check for hit
        if (attack_roll >= target.armor_class) {
            // roll damage
            console.log('hit!');
            var damage_roll = roll(4);
            console.log(damage_roll);
            target.take_damage(damage_roll);
        } else {
            console.log('miss!');
        }
        // advance the game state (note: this will fail for multi-attack)
        game_state = next_state;
    }
    use_action() {
        this.has_action = false;
    }
    take_damage(damage) {
        this.hit_points -= damage;
        if (this.hit_points < 1) {
            this.img.src = '#';
            console.log('unconscious!');
            if (this.name == "player") {
                game_state = "player_loses";
            } else if (this.name == "enemy") {
                game_state = "player_wins";
            }
        }
    }
    end_turn() {
        this.movement = this.speed;
        this.has_action = true;
        this.has_bonus_action = true;
    }
}

class Player extends Character {
    draw() {
        super.draw();
        
        if (game_state == "player_move_animation") {
            this.animate_move("default");
        }
    }
    attack_tile(i, j) {
        console.log(i, j, enemy.i, enemy.j);
        if (i == enemy.i & j == enemy.j) {
            this.loop = [3, 4, 5, 4];
            this.attack(enemy, "player_attack_animation");
        }
    }
    use_action() {
        super.use_action();
        // disable action buttons
        var btn = document.getElementById("btn_attack");
        btn.classList.add('disabled');
        btn.classList.remove('enabled');
    }
    move(i, j) {
        super.move(i, j);

        // set next state
        game_state = "player_move_animation";

        // disable move buttons
        if (this.movement < w) {
            var btn = document.getElementById("btn_move");
            btn.classList.add('disabled');
            btn.classList.remove('enabled');
        }
    }
    end_turn() {
        super.end_turn();

        // enable menu items
        var btns = document.getElementsByClassName("disabled");
        while (btns.length > 0) {
            btns[0].classList.add('enabled');
            btns[0].classList.remove('disabled');
        }
    }
}

class Enemy extends Character {
    draw() {
        super.draw();
        if (game_state == "enemy_move_animation") {
            this.animate_move("enemy_attack");
        } else if (game_state == "enemy_attack") {
            this.loop = [3, 4, 5, 4];
            this.attack(player, "enemy_attack_animation");
        }
    }
    move() {
        // compute distance to target
        var rng = this.range;
        var [tgt_r, tgt_phi] = vector(this.x, this.y, player.x, player.y);
        console.log('Distance:', tgt_r);
        console.log('Angle:', tgt_phi);

        var destination = [this.x, this.y];

        // move toward target if outside range
        if (tgt_r > rng) {
            var min_path = 9e9;     // minimize length of path
            var min_dist = 9e9;     // minimize distance to target
            var has_range = false;  // did we find a spot where the target is in range?

            // loop through possible tiles
            for (var x_ = -this.speed; x_ < this.speed + 1; x_ += w) {
                for (var y_ = -this.speed; y_ < this.speed + 1; y_ += h) {
                    var [r_, phi_] = vector(this.x, this.y, x_, y_);
                    var [r_target, phi_target] = vector(player.x, player.y, x_, y_);
                    // check that tile is within movement range
                    if (r_ <= this.speed) {
                        // check that target is in range from new tile
                        if (r_target <= this.range & r_target > 0) {
                            // check for minimum path
                            if (r_ < min_path) {
                                destination = [x_, y_];
                                min_path = r_;
                                has_range = true;
                                // console.log('target in range from', x_, y_);
                            }
                        } else {
                            // target is not within range, get as close as possible
                            if (r_target < min_dist & !has_range) {
                                destination = [x_, y_];
                                min_dist = r_target;
                                // console.log('from', x_, y_, 'target is', r_target, 'away');
                            }
                        }
                    }
                }
            }
        }
        // move to destination
        [this.destination_x, this.destination_y] = destination;
        game_state = "enemy_move_animation";
    }
}

// class instances
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------

let map = new Map(10, 5);
let player = new Player("player", 1, 1);
let enemy = new Enemy("enemy", 1, 2);

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    map.draw();

    if (game_state == "player_wins") {
        console.log("You Win!");
        player.draw();
    } else if (game_state == "player_loses") {
        console.log("You Lose!");
        enemy.draw();
    } else {
        if (player.hit_points > 0) {
            player.draw();
        } else {
            game_state = "player_loses";
        }
        if (enemy.hit_points > 0) {
            enemy.draw();
        } else {
            game_state = "player_wins";
        }
    }
    counter += 1;
}
var interval = setInterval(draw, 50);


// event listeners
// classes
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------

// mouse move
document.addEventListener("mousemove", mouseMove, false);
function mouseMove(e) {
    // get mouse coordinates
    var bounds = canvas.getBoundingClientRect();
    var x = e.clientX - bounds.left;
    var y = e.clientY - bounds.top;

    // convert to grid coordinates
    // set active grid square
    active_i = Math.floor(x / w);
    active_j = Math.floor(y / h);
}

// mouse click
document.addEventListener("click", onClick, false);
function onClick(e) {
    // get mouse coordinates
    var bounds = canvas.getBoundingClientRect();
    var x = e.clientX - bounds.left;
    var y = e.clientY - bounds.top;

    // convert to grid coordinates
    var i = Math.floor(x / w);
    var j = Math.floor(y / h);

    // check game state
    if (game_state == "player_move") {
        if (i >= 0 & j >= 0) {
            player.move(i, j);
        }
    } else if (game_state == "player_attack") {
        console.log("player attacks", i, j);
        player.attack_tile(i, j);
    }
}

// menu items
// ----------

// move
document.getElementById("btn_move").onclick = function() { playerMove() };
function playerMove() {
    console.log("Player moves");
    game_state = "player_move";
}

// attack
document.getElementById("btn_attack").onclick = function() { playerAttack() };
function playerAttack() {
    if (player.has_action) {
        console.log("Player attacks");
        game_state = "player_attack";
    } else {
        console.log("Already used action this turn");
        game_state = "default";
    }
}

// end turn
document.getElementById("btn_endturn").onclick = function() {playerEndTurn()};
function playerEndTurn() {
    console.log("Player ends turn");
    game_state = "default";
    player.end_turn();
    enemy.move();
}