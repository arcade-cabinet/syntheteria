# Orchestrator Analysis — PRD Batch Execution
Generated: 2026-03-26
Task: Execute PRD user stories for Syntheteria

## Classification
- **Complexity**: 9/10
- **Adversarial Required**: Yes
- **Worktree**: No (working on feature branch)

## Task Prioritization (Dependency Order)

### Batch 1: Foundation (blocks everything)
1. **US-1.3**: dangerLevel() function + difficulty scaling
2. **US-1.2**: Board-driven entity spawning in chunks
3. **US-1.4**: Strip initializeWorld to only spawn 2 starter robots

### Batch 2: Interaction (depends on Batch 1)
4. **US-2.1**: Verify robots visible (code exists, needs testing/fixes)
5. **US-2.2**: Verify click-to-select, click-to-move (code exists)
6. **US-2.3**: Verify combat visual feedback (code exists)

### Batch 3: Economy (depends on Batch 2)
7. **US-3.1**: Base founding + BasePanel wiring
8. **US-3.2**: Power from lightning rods (system exists, needs wiring)
9. **US-3.3**: Repair system (exists, needs UI wiring)

### Batch 4: Enemies (depends on Batches 2+3)
10. **US-4.1**: Cult escalation over time
11. **US-4.2**: Cult AI (GOAP via Yuka)
12. **US-4.3**: Hack enemy machines

### Batch 5: Story (depends on Batches 1+2)
13. **US-5.1**: Dialogue triggered by exploration
14. **US-5.2**: Core storyline beats

### Batch 6: Polish
15. **US-6.1**: Fog of war on minimap
16. **US-6.2**: Storm and power math
17. **US-6.3**: Audio plays correctly
18. **US-6.4**: Save and load
19. **US-6.5**: Mobile responsive
