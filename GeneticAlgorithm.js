
const AGENT_DURATION = 0.15;
const THOUGHT_INCREASE_INCREMENT = 5;
const GENERATIONS_TO_INCREASE_MAX_THOUGHTS = 5;
const GENERATION_TO_SET_BEST_FIT_TO_ALL = 5;
const AI_COLLIDE_HELPER = 7;
const KILL_GENERATION_MAJORITY_DEAD_CUTOFF = .1;

//Fitness score vars
const TIME_TAKEN_WEIGHT = 0;
const DIST_FROM_SPAWN_WEIGHT = 0;
const DIST_TRAVELED_MULTIPLIER = 0;
const DIED_TO_ENEMY_MULTIPLIER = 1.1;
const DEATH_INCREMENT = 0;

const MUTATION_CHANCE = 0.01;

class Node {

    constructor(pos, reached) {
        this.pos = {
            x: pos.x,
            y: pos.y
        }

        this.reached = reached
        this.distToGoal = undefined;
    }

    calcDistToGoal(goalPos) {

        this.distToGoal = Math.sqrt( (this.pos.x - goalPos.x)**2 + (this.pos.y - goalPos.y)**2 );

    }

}
class Agent {

    constructor(thinkingIterations, maxSpeed, width) {

        this.ai = {
            maxThinkingIterations: thinkingIterations,
            maxSpeed: maxSpeed,
            brain: [],
            thoughtIndex: 0,
            loopCounter: 0,
            fitness: 9999,
            timeTaken: 0,
            distTraveled: 0,
            diedToEnemy: false,
            deathThoughtIndex: 0

        }

        this.isDead = false;

        this.pos = {
            x: undefined,
            y: undefined
        }

        this.vx = 0;
        this.vy = 0;



        this.width = width;
        this.renderPadding = 3;


        
    }

    think() {
        if(this.isDead) return;

        this.ai.loopCounter++;

        this.vx = this.ai.brain[this.ai.thoughtIndex].vx;
        this.vy = this.ai.brain[this.ai.thoughtIndex].vy;

        if(this.ai.loopCounter > 60 * this.ai.brain[this.ai.thoughtIndex].duration) {

            this.ai.loopCounter = 0;
            this.ai.thoughtIndex++;
            this.ai.timeSurvivied++;


        }


        if(this.ai.thoughtIndex >= this.ai.maxThinkingIterations)
            this.isDead = true;


    }

    checkMove(deltaTime, map) {

        var moveX = this.pos.x;
        var moveY = this.pos.y;

        if(this.vx > 0)
            moveX = (this.pos.x + this.width/2) + this.vx * deltaTime;
        else if(this.vx < 0)
            moveX = (this.pos.x - this.width/2) + this.vx * deltaTime;

        if(this.vy > 0)
            moveY = (this.pos.y + this.width/2) + this.vy * deltaTime;
        else if(this.vy < 0)
            moveY = (this.pos.y - this.width/2) + this.vy * deltaTime;
        
        
        var checkMove = true;
        
        var moveTileX = Math.floor( (moveX - map.mapOffsetX) / TILE_WIDTH );

        var moveTileY = Math.floor( (moveY - map.mapOffsetY) / TILE_WIDTH );

        
        var moveTile = map.map[moveTileY][moveTileX];
        

        if(moveTile.type == TILES.bg.id) {
            checkMove = false;
        }else if(moveTile.type == TILES.end.id) {
            this.reachedFinish = true;
        }else {
            checkMove = true;
        }

        return checkMove;
        

        

    }

    update(deltaTime, map) {
        if(this.isDead) return;


        for(var i=0; i < map.enemies.length; i++) {
            var enemy = map.enemies[i];

            this.ai.diedToEnemy = checkCollision(this.pos.x, this.pos.y, this.width, this.width,
                enemy.pos.x + AI_COLLIDE_HELPER, enemy.pos.y + AI_COLLIDE_HELPER, enemy.radius*2 - AI_COLLIDE_HELPER, enemy.radius*2 - AI_COLLIDE_HELPER);
            
            if(this.width == undefined) console.log("WIDTH is culprit");
            if(enemy.radius == undefined) console.log("RADIUS is culprit");


            if(this.ai.diedToEnemy) {
                this.ai.deathThoughtIndex = this.ai.thoughtIndex;
                this.isDead = true;
                return;
            }
        }


        var canMove = this.checkMove(deltaTime, map);
        if(!canMove) return;

        this.pos.x += this.vx * deltaTime;
        this.pos.y += this.vy * deltaTime;

        this.ai.distTraveled += Math.sqrt( (this.vx * deltaTime)**2 + (this.vy * deltaTime)**2 );

    }


    render(ctx) {
        if(this.isDead) return;

        ctx.fillStyle = "black";

        ctx.fillRect(this.pos.x - this.width/2, this.pos.y - this.width/2, 
            this.width, this.width)
    
        ctx.fillStyle = "red";
            
        ctx.fillRect(this.pos.x - this.width/2 + this.renderPadding, this.pos.y - this.width/2 + this.renderPadding, 
                this.width - this.renderPadding*2, this.width - this.renderPadding*2)
    }

}

//collision between to rectangular objects, good enough
function checkCollision(obj1X, obj1Y, obj1Width, obj1Height, obj2X, obj2Y, obj2Width, obj2Height) {
    if (obj1X < obj2X + obj2Width &&
        obj1X + obj1Width > obj2X &&
        obj1Y < obj2Y + obj2Height &&
        obj1Y + obj1Height > obj2Y) {
            return true
    }
}

const AGENT_THOUGHT_PROPERTIES = {

    0: "vx",
    1: "vy",
    2: "duration"

}



class Thought {

    constructor(randVx, randVy, randDuration) {
        
        this.vx = randVx;
        this.vy = randVy;
        this.duration = randDuration;
        
    }

    key(n) {
        return this[Object.keys(this)[n]];
    }
}

function key(obj, idx) {
    return object.key.call(obj, idx);
}

class GeneticAlgorithm {

    constructor(population, maxThinkingIterations, maxSpeed, agentWidth, startPos, goalPos, nodes) {
        
        this.maxPopulation = population;
        this.agentProps = {
            maxAgentSpeed: maxSpeed,
            maxThinkingIterations: maxThinkingIterations,
            agentWidth: agentWidth
        }

        this.parents = {
            parent1: undefined,
            parent2: undefined
        }

        this.bestAgentIndex = undefined;

        this.startPos = {
            x: startPos.x,
            y: startPos.y
        }

        this.goalPos = {
            x: goalPos.x,
            y: goalPos.y
        }

        this.highestFitnessScore = 100000;
        this.bestGenerationFitness = 100000;
        this.fitnessSum = 0;

        this.nodes = nodes

        this.hasMapReset = true;
        this.agentReachedFinish = false;

        this.currentGeneration = 1;

        this.population = [];

        this.createPopulation();

    }


    updateAgents(deltaTime, map) {
        if(!this.hasMapReset) return;

        var deadAgents = 0;
        for(var i=0; i < this.population.length; i++)
        {
            
            this.population[i].think();
            this.population[i].update(deltaTime, map);

            
            this.calcFitness(this.population[i], this.startPos, this.goalPos);

            if(this.population[i].isDead) 
                deadAgents++;
            


            
        }

        var percentAgentsLeft = (this.maxPopulation - deadAgents) / this.maxPopulation;
        
        

        //if all agents have died, perform selection and crossover
        if(deadAgents >= this.maxPopulation)
        {
            if(percentAgentsLeft < KILL_GENERATION_MAJORITY_DEAD_CUTOFF && deadAgents != this.maxPopulation) console.log("majority dead");

            this.calcFitnessSum();

            this.sort();
            this.selectParents();

            //this.findBestAgent();
            
            if(this.currentGeneration % GENERATIONS_TO_INCREASE_MAX_THOUGHTS == 0)
                this.increaseBrainPower(THOUGHT_INCREASE_INCREMENT);

            this.doCrossover();
          //  this.doNaturalSelection();

            this.fitnessSum = 0;
            //this.mutate(MUTATION_CHANCE);
            this.mutateBasedOffDeath(MUTATION_CHANCE)

            this.hasMapReset = false;

        } 
    }

    createPopulation() {
        for(var i=0; i < this.maxPopulation; i++) {
            var newMember = this.randomizeFeatures(new Agent(this.agentProps.maxThinkingIterations, this.agentProps.maxAgentSpeed, this.agentProps.agentWidth));

            newMember.pos.x = this.startPos.x;
            newMember.pos.y = this.startPos.y;

            this.population.push(newMember);
        }

    }

    createOffspring(parent) {

        var newChild = new Agent(this.agentProps.maxThinkingIterations, this.agentProps.maxAgentSpeed, this.agentProps.agentWidth);

        newChild.ai.fitness = 9999;
        newChild.ai.diedToEnemy = false;


        newChild.pos.x = this.startPos.x;
        newChild.pos.y = this.startPos.y;


        for(var index=0; index < parent.ai.maxThinkingIterations; index++) {
            newChild.ai.brain[index]  = new Thought(undefined, undefined, undefined);
            
            newChild.ai.brain[index]["vx"] = parent.ai.brain[index]["vx"]; 
            newChild.ai.brain[index]["vy"] = parent.ai.brain[index]["vy"]; 
            newChild.ai.brain[index]["duration"] = parent.ai.brain[index]["duration"]; 

            
        }

        return newChild;


    }
    calcFitnessSum() {
        this.fitnessSum = 0;
        for(var i=0; i < this.population.length; i++) {
            this.fitnessSum += this.population[i].ai.fitness;

        }
    }

    calcFitness(member, startPos, goalPos) {

        this.agentReachedFinish = false;
        this.bestGenerationFitness = 100000;

        var goalDistX = member.pos.x - goalPos.x;
        var goalDistY = member.pos.y - goalPos.y;

        var nodeReached = false;
        for(var i=0; i < this.nodes.length; i++) {

            var node = this.nodes[i];

            goalDistX = Math.abs(member.pos.x - node.pos.x);
            goalDistY = Math.abs(member.pos.y - node.pos.y);
            

            if(goalDistX <= 1 && goalDistY <= 1) {
                nodeReached = true;
                this.nodes.splice(i, 1);
            }

            
            

        }

        

        var spawnDistX = member.pos.x - startPos.x;
        var spawnDistY = member.pos.y - startPos.y;

        var sqrDist = Math.sqrt( goalDistX**2 + goalDistY**2 );

        if(sqrDist <= 1)
            this.agentReachedFinish = true;

        var sqrSpawnDistTraveled = Math.sqrt( spawnDistX**2 + spawnDistY**2 );

    //    var taxiDist = Math.abs(goalDistX) + Math.abs(goalDistY);
     //   var taxiDistTraveled = Math.abs(spawnDistX) + Math.abs(spawnDistY);

        var distScore = sqrDist - sqrSpawnDistTraveled*DIST_FROM_SPAWN_WEIGHT + member.ai.distTraveled*DIST_TRAVELED_MULTIPLIER;
        var timeScore = member.ai.timeTaken*TIME_TAKEN_WEIGHT;

        

        member.ai.fitness = distScore - timeScore;

        if(member.ai.diedToEnemy)
            member.ai.fitness *= DIED_TO_ENEMY_MULTIPLIER; 

        if(member.ai.fitness < this.highestFitnessScore)
            this.highestFitnessScore = member.ai.fitness;


        if(member.ai.fitness < this.bestGenerationFitness)
            this.bestGenerationFitness = member.ai.fitness;

        if(nodeReached)
            this.highestFitnessScore = 1000000

    }

    sort() {
        this.population.sort(function(a, b) {
            return a.ai.fitness - b.ai.fitness;
        });
    }

    findBestAgent() {

        var min = 100000;
        var minIndex = 0;
        for (var i = 0; i < this.population.length; i++) {
          if (this.population[i].ai.fitness <= min) {
            min = this.population[i].fitness;
            minIndex = i;
            
            
          }
        }
    
        this.bestAgentIndex = minIndex;


        if (min < this.highestFitnessScore) 
            this.highestFitnessScore = min;
        
    
        
    }

    selectParents() {

        

        this.sort();



        if(this.population[0].ai.fitness < this.highestFitnessScore) return;
        //since previously sorted, pick the first two
        this.parents.parent1 = this.population[0];
        this.parents.parent2 = this.population[1];

        
    }

    selectParentBasedOffFitness() {
        var rand = Math.random() * this.fitnessSum;

        var runningSum = this.fitnessSum;

        for (var i = 0; i < this.population.length; i++) {

            runningSum -= this.population[i].ai.fitness;

            if (rand >= runningSum) {
                
                return this.population[i];
                
            }
        }

        console.log("THIS SHOULD NOT APPEAR, CHECK FOR ERROR")
        return null;

        

    }

    renderAgents(ctx) {

        for(var i=0; i < this.population.length; i++) {
            this.population[i].render(ctx);
        }

    }

    increaseBrainPower(numThoughtsToAdd) {
        this.agentProps.maxThinkingIterations += numThoughtsToAdd;
        for(var pop=0; pop < this.maxPopulation; pop++) {

            this.population[pop].ai.maxThinkingIterations += numThoughtsToAdd;
            for(var i=0; i < numThoughtsToAdd; i++) {
                var member = this.population[pop]
                member.ai.brain.push(this.randomThought(member));
                


            }
        }

    }

    doCrossover() {
        this.currentGeneration++;

        var totalNewMembers = 0;
        var newPopulation = [];

        newPopulation.push( this.createOffspring(this.parents.parent1) );
        totalNewMembers++;

        while(totalNewMembers < this.maxPopulation) {

           // if(switchParents <= 0.5) {
            var parent1 = this.parents.parent1;
            var parent2 = this.parents.parent1;//this.selectParentBasedOffFitness();
           // }else {
            //    var parent2 = this.parents.parent1;
          //      var parent1 = this.parents.parent2;
           // }

            var newChild = new Agent(this.agentProps.maxThinkingIterations, this.agentProps.maxAgentSpeed, this.agentProps.agentWidth);

            newChild.ai.fitness = 9999;
            newChild.ai.diedToEnemy = false;


            newChild.pos.x = this.startPos.x;
            newChild.pos.y = this.startPos.y;



            for(var index=0; index < parent1.ai.maxThinkingIterations; index++) {

                var rand = Math.random();

                //set thought at index to be blank thought
                newChild.ai.brain[index]  = new Thought(undefined, undefined, undefined);
                
                
                //choose either parent 1 or parent 2 thought to be at the index
                if(rand >= 0.5) {
                    newChild.ai.brain[index]["vx"] = parent1.ai.brain[index]["vx"]; 
                    newChild.ai.brain[index]["vy"] = parent1.ai.brain[index]["vy"]; 
                    newChild.ai.brain[index]["duration"] = parent1.ai.brain[index]["duration"]; 

                }
                else {
                    newChild.ai.brain[index]["vx"] = parent2.ai.brain[index]["vx"]; 
                    newChild.ai.brain[index]["vy"] = parent2.ai.brain[index]["vy"]; 
                    newChild.ai.brain[index]["duration"] = parent2.ai.brain[index]["duration"]; 
                }
            }



            //OLD CROSSOVER CODE
           {/* var chanceToBeChildClone = Math.random();

            if(this.currentGeneration % GENERATION_TO_SET_BEST_FIT_TO_ALL == 0) {
            
                
                for(var index=0; index < parent1.ai.brain.length; index++){
                    newChild.ai.brain[index]  = new Thought(undefined, undefined, undefined);
                
                    newChild.ai.brain[index]["vx"] = parent1.ai.brain[index]["vx"]; 
                    newChild.ai.brain[index]["vy"] = parent1.ai.brain[index]["vy"]; 
                    newChild.ai.brain[index]["duration"] = parent1.ai.brain[index]["duration"]; 
                }

                newChild.ai.fitness = 9999;

                newChild.pos.x = this.startPos.x;
                newChild.pos.y = this.startPos.y;


                newPopulation.push(newChild);
                totalNewMembers++;
                continue;
            }
            

            for(var index=0; index < parent1.ai.brain.length; index++) {
            //    var parent2Thought = parent2.ai.brain[index];

            

                
                
                //set newchild brain to parent 1, then split and add parent 2's brain
                newChild.ai.brain[index]  = new Thought(undefined, undefined, undefined);
                
                newChild.ai.brain[index]["vx"] = parent1.ai.brain[index]["vx"]; 
                newChild.ai.brain[index]["vy"] = parent1.ai.brain[index]["vy"]; 
                newChild.ai.brain[index]["duration"] = parent1.ai.brain[index]["duration"]; 
                
                

                newChild.ai.fitness = 9999;

                newChild.pos.x = this.startPos.x;
                newChild.pos.y = this.startPos.y;
                

                var crossoverIndex;
                //splitindex is at most the number of .brain properties length - 1
                //if duration is constant between all agents, no point in doing crossover with this trait
                if(newChild.ai.brain[index]["duration"] == AGENT_DURATION)
                    crossoverIndex = Math.floor( Math.random()* 2);
                else 
                    crossoverIndex = Math.floor( Math.random() * 3);

                

                var key = AGENT_THOUGHT_PROPERTIES[crossoverIndex];
                newChild.ai.brain[index][key] = parent2.ai.brain[index][key];


                if( newChild.ai.brain[index][key] == undefined)
                    console.log("error during crossover, need to investigate");
               /* var newThought = new Thought()
                for(; splitIndex < parent2.ai.brain.length-1; splitIndex++) {
                    var key = AGENT_THOUGHT_PROPERTIES[splitIndex];
                    console.log("KEY: " + key)
                    

                 //   newChild.ai.brain[index][key] = parent2.ai.brain[index][key];


                }

            
            //    console.log("parent1: " + parent1.ai.brain[index].vx);
            //    console.log("parent2: " + parent2.ai.brain[index].vx);
             //   console.log("child: " + newChild.ai.brain[index].vx + ", split index:" + crossoverIndex);


                

        }*/}

            newPopulation.push(newChild);
            totalNewMembers++;

        }

        this.population = newPopulation;
    }


    doNaturalSelection() {
        this.currentGeneration++;

        var totalNewMembers = 0;
        var newPopulation = [];

        newPopulation.push( this.createOffspring(this.population[this.bestAgentIndex]) );
        totalNewMembers++;

        while(totalNewMembers < this.maxPopulation) {
            var parent = this.selectParentBasedOffFitness();
 
            var newChild = this.createOffspring(parent)


            newPopulation.push(newChild);
            totalNewMembers++;

        }

        this.population = newPopulation;
    }


    mutate(chance) {


        for(var i=0; i < this.population.length; i++) {
            var rand = Math.random()
        
    
            
            for(var t=0; t < member.ai.maxThinkingIterations; t++) {

                if(rand <= chance) {
                    var member = this.population[i];
                    member.ai.brain[t] = this.randomThought(member);

                }

            }
        }
    
    
    
    }

    mutateBasedOffDeath(chance) {


        for(var i=0; i < this.population.length; i++) {
            var rand = Math.random()
        
    
            
            var member = this.population[i];
            var died = member.diedToEnemy;
            var deathAtThought = member.ai.deathThoughtIndex;

            for(var t=0; t < member.ai.maxThinkingIterations; t++) {
                    
                var rand = Math.random();

                if(died && t > deathAtThought - 10)
                    rand = Math.random() * 0.2;

                if(rand < chance)
                    member.ai.brain[t] = this.randomThought(member);
            }

            
        }
    
    
    
    }

    

    /*
    .ai.maxThinkingIterations
    .ai.maxSpeed

    .ai.brain[i].vx
    .ai.brain[i].vy
    .ai.brain[i].duration

    */
    randomizeFeatures(member) {
        var newMember = member;

        for(var i=0; i < newMember.ai.maxThinkingIterations; i++) {
            
            newMember.ai.brain.push(this.randomThought(newMember));

        }

        return newMember;
    }

    randomThought(newMember) {

        var rand1 = Math.random();
        var rand2 = Math.random();
        var randVx; 
        var randVy;
        
        //var randDuration = Math.random() + .1; 
        var randDuration = AGENT_DURATION;

        if(rand1 <= 0.5)
            randVx = (rand2 > 0.5) ? newMember.ai.maxSpeed : -newMember.ai.maxSpeed;
        else 
            randVx = 0;

        rand1 = Math.random();
        rand2 = Math.random();

        if(rand1 <= 0.5)
            randVy = (rand2 > 0.5) ? newMember.ai.maxSpeed : -newMember.ai.maxSpeed;
        else 
            randVy = 0;

        return new Thought(randVx, randVy, randDuration);
    }


    render(ctx) {

        for(var i=0; i < this.population.length; i++) {

            var agent = this.population[i];

            agent.render();

        }

    }

}






