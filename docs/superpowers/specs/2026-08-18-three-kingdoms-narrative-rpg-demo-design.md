# Three Kingdoms Narrative RPG Demo Design

Date: 2026-08-18  
Status: Draft for review

## Summary
A vertical-slice demo for a Three Kingdoms narrative RPG set in the late Eastern Han. The player starts as a refugee, forms a 3-person party, moves through a semi-open local region, and makes one major choice that affects a later encounter. The demo proves three pillars at once: exploration, tactical turn-based combat, and branching consequences.

## Product Goals
- Make the player feel the pressure of surviving in a collapsing world.
- Show that the game is about ordinary people being pulled into history.
- Make combat strategic enough to stand on its own.
- Demonstrate that key historical pressure points can branch.

## Non-Goals
- Full campaign scale.
- Large open world.
- Dozens of classes, factions, or endings.
- Deep economy, city building, or grand strategy.

## Player Fantasy
Start as a nobody, survive the road, gain allies, pick a side, and begin to shape history instead of only being shaped by it.

## Core Loop
Travel -> encounter -> tactical battle or dialogue event -> town recovery and recruiting -> story choice -> consequence battle or scene -> next route.

## Demo Structure
1. Opening escape. The player flees as a refugee and learns movement, party setup, and basic interaction.
2. First ally. A fixed companion joins, establishing the party core and the first combat role.
3. First combat. A road ambush establishes positioning, skills, and resource use.
4. Town hub. The player can rest, speak, recruit the second companion, and see the local political tension.
5. Branch choice. The player chooses between survival, mercy, or obedience in a situation that matters.
6. Consequence. The choice changes a later battle setup and one key conversation.
7. Closing beat. The demo ends with a clear forward hook into wider conflict.

## Exploration
- Semi-open local map, not a full world map.
- One starting route, one settlement, one road checkpoint, and one hub town.
- Optional events exist on side paths, but the route order is simple enough for a short demo.
- The region should feel traversable rather than empty.

## Party and Combat
- The combat party is 3 characters.
- The player character anchors the party.
- The first companion fills a stable frontline or support role.
- A second companion is recruited or unlocked through the town sequence.
- Combat is turn-based and position-aware.
- Position matters through front/back placement, line attacks, and target access.
- Each character has a small kit: basic attack, defensive option, and 2-3 signature skills.
- The system emphasizes synergy, tempo, and resource management over raw stat checks.
- Each turn grants action points, and strong offensive or defensive play builds Resolve for stronger moves.
- Battle clarity matters more than large unit counts.
- Demo enemy roster stays small: bandits, militia scouts, desperate deserters, and one mini-boss.

## Narrative and Choice
- The opening frame is a refugee story, not a hero origin.
- The first fixed companion creates an immediate bond and a practical reason to keep moving.
- The major choice should be morally legible and materially meaningful: save people, obey power, or protect the party's survival.
- The result must change at least one battle and one later line of dialogue.
- Historical events are pressure rather than railroads: the player can deviate, but the world responds.

## Content Scope
- 1 starting sequence
- 1 small region
- 1 town hub
- 1 fixed companion plus 1 recruitable companion, for 2 non-player party members total in the demo path
- 3 to 4 enemy archetypes
- 1 mid-demo decision with downstream consequence
- 1 final encounter or mini-boss

## Success Criteria
- The player understands the premise within the first 10 minutes.
- Combat feels tactical with only a few encounters.
- One story choice clearly changes a later outcome.
- The demo ends with a clear desire to continue.

## Risks
- Too much systemic ambition can dilute the vertical slice.
- Too many combat options can hide the narrative.
- Too little map structure can make "semi-open" feel fake.
