/* Beat lists for the three pinned scenes. The pager parks the playhead
   exactly on a beat, so a scene has as many beats as this array has entries. */

export const PLANT_STEPS = [
  { title: 'The reactor core', cx: 124, cy: 284, s: 2.15,
    text: 'Uranium atoms split apart, releasing intense heat with no flame and no smoke. Control rods slide between the fuel rods to speed the reaction up or slow it down.' },
  { title: 'The steam generator', cx: 261, cy: 268, s: 2.15,
    text: 'That superheated water runs through thousands of thin tubes, boiling a completely separate loop into steam. The two loops never mix, so the water that boils never touches the reactor.' },
  { title: 'The turbine hall', cx: 508, cy: 247, s: 1.8,
    text: 'High-pressure steam blasts into the turbine and spins it thousands of times a minute. The shaft drives a generator exactly as it would in a coal or gas plant. Only the heat source is different.' },
  { title: 'The condenser', cx: 458, cy: 345, s: 2.3,
    text: 'Spent steam is cooled back into liquid water and pumped straight to the steam generator to boil again, around and around in a sealed loop.' },
  { title: 'The switchyard', cx: 696, cy: 235, s: 2.3,
    text: 'A transformer boosts the voltage on the way out. High voltage lets the power travel for miles down the transmission lines with very little lost along the way.' },
  { title: 'The cooling tower', cx: 835, cy: 331, s: 2.0,
    text: 'Leftover heat leaves through a third water loop as water vapor, which condenses into the visible white plume. That plume is not smoke and it is not radioactive; it is the same cloud that rises off a boiling kettle.' }
];

export const FISSION_STEPS = [
  { title: 'A free neutron', text: 'It starts with one loose neutron drifting through the fuel. Slow neutrons work best: a fast one tends to glance off, while a slow one lingers long enough to be caught.' },
  { title: 'The nucleus absorbs it', text: 'A uranium-235 nucleus swallows the neutron and becomes uranium-236 for an instant. The extra energy makes it wobble and stretch like a droplet about to break.' },
  { title: 'The split', text: 'It tears in two. A little of its mass converts straight into energy (E = mc²), which is why a fuel pellet the size of a fingertip holds roughly as much energy as a ton of coal.' },
  { title: 'Two or three more neutrons', text: 'The split also flings out fresh neutrons. This is the part that matters: the reaction has just produced the very thing that started it.' },
  { title: 'The chain reaction', text: 'Those neutrons find more nuclei and split them too. Each generation can double the last, which is what makes fission self-sustaining rather than a one-off event.' },
  { title: 'The number that decides', text: 'Whether that chain grows or fades comes down to one number, k: how many neutrons from each split go on to cause another. Below one it dies out; above one it grows; at exactly one it sustains itself. Holding it at one is what a reactor does.' }
];

export const BUILD_STEPS = [
  { title: 'Clearing the site', text: 'Years before any concrete, the ground is surveyed and cleared. The location has to satisfy seismology, hydrology, and a grid connection all at once, which is why siting alone can take a decade.' },
  { title: 'Excavation', text: 'Crews dig out to solid bedrock, often twenty meters down. The rock has to be sound enough to carry the whole plant and hold it steady through an earthquake.' },
  { title: 'The base mat', text: 'A single raft of reinforced concrete is poured across the pit in one continuous operation, sometimes running for days without stopping. Every building above is anchored to this one slab.' },
  { title: 'Containment rises', text: 'Metre-thick reinforced concrete walls climb around a sealed steel liner. This is the shell built to hold everything in, whatever happens inside it.' },
  { title: 'The dome goes on', text: 'The dome is assembled on the ground and lifted into place in one piece by one of the largest cranes on earth. It is the moment the building becomes recognizable.' },
  { title: 'The reactor arrives', text: 'The pressure vessel is lowered in and the internals follow: steam generators, pumps, and thousands of kilometers of cable. Most of the remaining work is now inside.' },
  { title: 'The turbine hall', text: 'The conventional half goes up alongside: turbine, generator, condenser. This part is much the same as any thermal power station; only the heat source differs.' },
  { title: 'Cooling towers', text: 'The towers are slip-formed upward in a continuous pour, growing a few meters a day until they stand taller than almost anything else on site.' },
  { title: 'Connected to the grid', text: 'The switchyard ties the plant into the transmission network. After years of commissioning and regulator sign-off, it synchronizes to the grid and starts delivering power.' }
];
