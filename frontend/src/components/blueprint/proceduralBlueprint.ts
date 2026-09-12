/**
 * Procedural Floor Plan Blueprint Generator
 * 
 * NOTE: Architectural CAD blueprints generated from the real rooftop footprints,
 * aspect ratios, per-floor heights, and circulation layouts of Brainware University campus buildings.
 */

import { CAMPUS_BUILDINGS, getCampusBuilding, getBuildingSvgPolygon } from '../../constants/campusBuildings';

export interface BlueprintRoom {
  id: string;
  code: string;
  name: string;
  areaSqM: number;
  x: number; // In SVG canvas units (0..1000)
  y: number;
  width: number;
  height: number;
  door: {
    x: number;
    y: number;
    wall: 'top' | 'bottom' | 'left' | 'right';
    swing: 'left' | 'right';
  };
  extinguisherAnchor?: {
    x: number;
    y: number;
  };
}

export interface BlueprintCore {
  stairwell: {
    x: number;
    y: number;
    width: number;
    height: number;
    treads: number;
    label: string;
  };
  elevator: {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
  };
  extinguisherAnchor: {
    x: number;
    y: number;
  };
}

export interface BlueprintCorridor {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  anchors: Array<{ x: number; y: number; label: string }>;
}

export interface BuildingBlueprint {
  buildingId: string;
  buildingName: string;
  buildingCode: string;
  floors: number;
  floor: number;
  floorLabel: string;
  floorHeightM: number;
  totalHeightM: number;
  elevationM: number;
  realDimensionsM: { width: number; depth: number };
  aspectRatio: number;
  canvasBounds: { x: number; y: number; width: number; height: number };
  footprintPolygonPoints: Array<{ x: number; y: number }>;
  footprintSvgPath: string;
  innerWallSvgPath: string;
  corridor: BlueprintCorridor;
  core: BlueprintCore;
  rooms: BlueprintRoom[];
  structuralColumns: Array<{ x: number; y: number }>;
  dimensionLabels: {
    topM: string;
    leftM: string;
  };
}

// ---------------------------------------------------------------------------
// Building Archetype Specifications
// ---------------------------------------------------------------------------

interface BuildingArchetype {
  id: string;
  name: string;
  code: string;
  floors: number;
  widthM: number;
  depthM: number;
  type: 'classroom' | 'lab' | 'library' | 'law' | 'health' | 'food_court';
  getFloorRooms: (floor: number, bounds: { x: number; y: number; width: number; height: number }, corridorY: number, corridorH: number) => BlueprintRoom[];
  getCorePosition: (bounds: { x: number; y: number; width: number; height: number }) => BlueprintCore;
}

export const CAMPUS_BLUEPRINT_ARCHETYPES: Record<string, BuildingArchetype> = {
  '1': {
    id: '1',
    name: 'Central Library',
    code: 'BLDG-01',
    floors: 4,
    widthM: 39.0,
    depthM: 57.5,
    type: 'library',
    getCorePosition: (bounds) => ({
      stairwell: {
        x: bounds.x + 20,
        y: bounds.y + 20,
        width: 80,
        height: 110,
        treads: 10,
        label: 'FIRE STAIRS 01',
      },
      elevator: {
        x: bounds.x + 105,
        y: bounds.y + 20,
        width: 65,
        height: 65,
        label: 'LIFT 01',
      },
      extinguisherAnchor: {
        x: bounds.x + 130,
        y: bounds.y + 110,
      },
    }),
    getFloorRooms: (floor, bounds, corridorY, corridorH) => {
      const floorNames: Record<number, { top: string[]; bottom: string[] }> = {
        0: {
          top: ['Digital Archives & E-Resource Hub', 'Circulation & Issue Desk', 'Periodicals Reading Lounge'],
          bottom: ['General Book Stacks (A–M)', 'Reference & Cataloguing Hall', 'Librarian Office & Reprography'],
        },
        1: {
          top: ['Academic Journal Archive', 'Quiet Study Hall — East Wing', 'Group Discussion Suite 101'],
          bottom: ['Science & Tech Stacks (N–Z)', 'Faculty Reading Room', 'Audio-Visual Media Centre'],
        },
        2: {
          top: ['Research Scholar Cubicles', 'Rare Book & Manuscript Gallery', 'Thesis Repository'],
          bottom: ['Humanities & Law Stacks', 'Digital Media Editing Lab', 'Senior Librarian Chamber'],
        },
        3: {
          top: ['Special Collections & Archives', 'Executive Conference Hall', 'Library Admin Council'],
          bottom: ['Quiet Study Hall — West Wing', 'IT Server & Networking Room', 'Preservation & Binding Studio'],
        },
      };

      const names = floorNames[floor] || floorNames[0];
      const rooms: BlueprintRoom[] = [];
      const prefix = floor === 0 ? 'G' : `${floor}`;

      // Top wing rooms (right of the stair/lift core)
      const topStartX = bounds.x + 180;
      const topWidth = bounds.width - 200;
      const topRoomW = topWidth / names.top.length;
      const topRoomH = corridorY - bounds.y;

      names.top.forEach((title, idx) => {
        const rx = topStartX + idx * topRoomW;
        rooms.push({
          id: `room-${floor}-t${idx}`,
          code: `LIB-${prefix}${idx + 1}`,
          name: title,
          areaSqM: Math.round((topRoomW * topRoomH) / 120),
          x: rx,
          y: bounds.y + 10,
          width: topRoomW - 8,
          height: topRoomH - 15,
          door: {
            x: rx + topRoomW * 0.5,
            y: corridorY,
            wall: 'bottom',
            swing: 'right',
          },
          extinguisherAnchor: {
            x: rx + 30,
            y: corridorY - 12,
          },
        });
      });

      // Bottom wing rooms
      const bottomY = corridorY + corridorH;
      const bottomHeight = (bounds.y + bounds.height) - bottomY;
      const botRoomW = (bounds.width - 30) / names.bottom.length;

      names.bottom.forEach((title, idx) => {
        const rx = bounds.x + 15 + idx * botRoomW;
        rooms.push({
          id: `room-${floor}-b${idx}`,
          code: `LIB-${prefix}${idx + 4}`,
          name: title,
          areaSqM: Math.round((botRoomW * bottomHeight) / 120),
          x: rx,
          y: bottomY + 8,
          width: botRoomW - 8,
          height: bottomHeight - 20,
          door: {
            x: rx + botRoomW * 0.5,
            y: bottomY,
            wall: 'top',
            swing: 'left',
          },
          extinguisherAnchor: {
            x: rx + botRoomW - 30,
            y: bottomY + 18,
          },
        });
      });

      return rooms;
    },
  },

  '2': {
    id: '2',
    name: 'Main Academic Building',
    code: 'BLDG-02',
    floors: 6,
    widthM: 94.5,
    depthM: 50.0,
    type: 'classroom',
    getCorePosition: (bounds) => ({
      stairwell: {
        x: bounds.x + bounds.width * 0.45 - 55,
        y: bounds.y + 15,
        width: 75,
        height: 105,
        treads: 11,
        label: 'MAIN STAIRS',
      },
      elevator: {
        x: bounds.x + bounds.width * 0.45 + 25,
        y: bounds.y + 15,
        width: 65,
        height: 65,
        label: 'LIFT A/B',
      },
      extinguisherAnchor: {
        x: bounds.x + bounds.width * 0.45 + 50,
        y: bounds.y + 105,
      },
    }),
    getFloorRooms: (floor, bounds, corridorY, corridorH) => {
      const rooms: BlueprintRoom[] = [];
      const prefix = floor === 0 ? 'G' : `${floor}`;

      // Classroom-sized rooms: 4 on top wing (flanking central core) + 4 on bottom wing
      const topHeight = corridorY - bounds.y - 12;
      const bottomY = corridorY + corridorH + 8;
      const bottomHeight = (bounds.y + bounds.height) - bottomY - 14;

      // Top wing left side (2 classrooms)
      const leftTopW = (bounds.width * 0.45 - 70) / 2;
      for (let i = 0; i < 2; i++) {
        const rx = bounds.x + 15 + i * leftTopW;
        rooms.push({
          id: `room-${floor}-tl-${i}`,
          code: `CR-${prefix}0${i + 1}`,
          name: floor === 0 && i === 0 ? 'Admissions & Student Helpdesk' : `Smart Classroom ${prefix}0${i + 1}`,
          areaSqM: 42,
          x: rx,
          y: bounds.y + 12,
          width: leftTopW - 8,
          height: topHeight,
          door: { x: rx + leftTopW * 0.7, y: corridorY, wall: 'bottom', swing: 'right' },
          extinguisherAnchor: { x: rx + 25, y: corridorY - 12 },
        });
      }

      // Top wing right side (2 classrooms)
      const rightTopStartX = bounds.x + bounds.width * 0.45 + 95;
      const rightTopW = (bounds.x + bounds.width - 15 - rightTopStartX) / 2;
      for (let i = 0; i < 2; i++) {
        const rx = rightTopStartX + i * rightTopW;
        rooms.push({
          id: `room-${floor}-tr-${i}`,
          code: `CR-${prefix}0${i + 3}`,
          name: floor === 0 && i === 1 ? 'Dean & Academic Administration' : `Smart Classroom ${prefix}0${i + 3}`,
          areaSqM: 42,
          x: rx,
          y: bounds.y + 12,
          width: rightTopW - 8,
          height: topHeight,
          door: { x: rx + rightTopW * 0.3, y: corridorY, wall: 'bottom', swing: 'left' },
          extinguisherAnchor: { x: rx + rightTopW - 25, y: corridorY - 12 },
        });
      }

      // Bottom wing (4 classrooms/faculty rooms)
      const botRoomW = (bounds.width - 30) / 4;
      const botTitles = floor === 0 
        ? ['Main Lecture Hall 1', 'Main Lecture Hall 2', 'Faculty Staff Room', 'Exam Control Cell']
        : [`Lecture Classroom ${prefix}05`, `Lecture Classroom ${prefix}06`, `Department Library ${prefix}`, `Faculty Cabin Suite ${prefix}`];

      botTitles.forEach((title, i) => {
        const rx = bounds.x + 15 + i * botRoomW;
        rooms.push({
          id: `room-${floor}-b-${i}`,
          code: `CR-${prefix}0${i + 5}`,
          name: title,
          areaSqM: 52,
          x: rx,
          y: bottomY,
          width: botRoomW - 8,
          height: bottomHeight,
          door: { x: rx + botRoomW * 0.5, y: bottomY, wall: 'top', swing: 'right' },
          extinguisherAnchor: { x: rx + 30, y: bottomY + 16 },
        });
      });

      return rooms;
    },
  },

  '3': {
    id: '3',
    name: 'Engineering Block',
    code: 'BLDG-03',
    floors: 9,
    widthM: 69.8,
    depthM: 69.8,
    type: 'lab',
    getCorePosition: (bounds) => ({
      stairwell: {
        x: bounds.x + 20,
        y: bounds.y + bounds.height * 0.5 - 55,
        width: 85,
        height: 110,
        treads: 12,
        label: 'WEST FIRE STAIRS',
      },
      elevator: {
        x: bounds.x + 20,
        y: bounds.y + 20,
        width: 70,
        height: 70,
        label: 'SERVICE LIFT',
      },
      extinguisherAnchor: {
        x: bounds.x + 115,
        y: bounds.y + bounds.height * 0.5,
      },
    }),
    getFloorRooms: (floor, bounds, corridorY, corridorH) => {
      const floorLabs: Record<number, { top: string[]; bottom: string[] }> = {
        0: { top: ['Heavy Machinery & Welding Workshop', 'Electrical Substation & Power Grid Lab'], bottom: ['Automobile Engineering Lab', 'Material Testing & Metallurgy Unit'] },
        1: { top: ['Fluid Mechanics & Hydraulic Machines Lab', 'Thermodynamics & Heat Transfer Lab'], bottom: ['Strength of Materials Testing Lab', 'Applied Mechanics Research Studio'] },
        2: { top: ['Analog & Digital Circuit Design Lab', 'VLSI & Microelectronics Fabrication Lab'], bottom: ['Signal Processing & Telecommunications Lab', 'Instrumentation & Sensor Calibration Room'] },
        3: { top: ['Microprocessor & Embedded Systems Lab', 'IoT, Smart Devices & Telemetry Suite'], bottom: ['Wireless Sensor Networks Testing Bay', 'Hardware Prototype & PCB Assembly Lab'] },
        4: { top: ['CAD / CAM Advanced Modeling Studio', 'Finite Element Analysis (FEA) Simulation Lab'], bottom: ['Computational Fluid Dynamics (CFD) Bay', 'Industrial Robotics & Mechatronics Lab'] },
        5: { top: ['Robotics & Autonomous Drones Studio', 'AI, Deep Learning & Vision Research Lab'], bottom: ['Cyber-Physical Systems & Automation Bay', 'Graduate Research Innovation Center'] },
        6: { top: ['Advanced Software Engineering Studio', 'Network Security & Ethical Hacking Lab'], bottom: ['Cloud Infrastructure & DevOps Datacenter', 'Full-Stack Development Laboratory'] },
        7: { top: ['Big Data & High-Performance Computing', 'Quantum Algorithm & Cryptography Suite'], bottom: ['Natural Language Processing Research Bay', 'Virtual Reality & Metaverse Testing Room'] },
        8: { top: ['Engineering Dean Suite & Council Chamber', 'Patent & Tech Transfer Innovation Cell'], bottom: ['Department Auditorium & Colloquium Hall', 'Faculty Research Fellow Chambers'] },
      };

      const labs = floorLabs[floor] || floorLabs[0];
      const rooms: BlueprintRoom[] = [];
      const prefix = floor === 0 ? 'G' : `${floor}`;

      // Top wing: 2 large labs
      const topStartX = bounds.x + 120;
      const topWidth = bounds.width - 140;
      const topRoomW = topWidth / 2;
      const topHeight = corridorY - bounds.y - 12;

      labs.top.forEach((title, i) => {
        const rx = topStartX + i * topRoomW;
        rooms.push({
          id: `lab-${floor}-t${i}`,
          code: `ENG-${prefix}0${i + 1}`,
          name: title,
          areaSqM: 84,
          x: rx,
          y: bounds.y + 12,
          width: topRoomW - 10,
          height: topHeight,
          door: { x: rx + topRoomW * 0.4, y: corridorY, wall: 'bottom', swing: 'left' },
          extinguisherAnchor: { x: rx + 35, y: corridorY - 14 },
        });
      });

      // Bottom wing: 2 large labs
      const botStartX = bounds.x + 120;
      const botWidth = bounds.width - 140;
      const botRoomW = botWidth / 2;
      const bottomY = corridorY + corridorH + 8;
      const bottomHeight = (bounds.y + bounds.height) - bottomY - 14;

      labs.bottom.forEach((title, i) => {
        const rx = botStartX + i * botRoomW;
        rooms.push({
          id: `lab-${floor}-b${i}`,
          code: `ENG-${prefix}0${i + 3}`,
          name: title,
          areaSqM: 84,
          x: rx,
          y: bottomY,
          width: botRoomW - 10,
          height: bottomHeight,
          door: { x: rx + botRoomW * 0.6, y: bottomY, wall: 'top', swing: 'right' },
          extinguisherAnchor: { x: rx + botRoomW - 35, y: bottomY + 16 },
        });
      });

      return rooms;
    },
  },

  '4': {
    id: '4',
    name: 'Law & Management',
    code: 'BLDG-04',
    floors: 4,
    widthM: 63.6,
    depthM: 74.2,
    type: 'law',
    getCorePosition: (bounds) => ({
      stairwell: {
        x: bounds.x + 20,
        y: bounds.y + 20,
        width: 75,
        height: 100,
        treads: 10,
        label: 'STAIRS 01',
      },
      elevator: {
        x: bounds.x + 100,
        y: bounds.y + 20,
        width: 60,
        height: 60,
        label: 'LIFT',
      },
      extinguisherAnchor: {
        x: bounds.x + 115,
        y: bounds.y + 100,
      },
    }),
    getFloorRooms: (floor, bounds, corridorY, corridorH) => {
      const lawRooms: Record<number, { top: string[]; bottom: string[] }> = {
        0: { top: ['Moot Court Hall (Simulated High Court)', 'Legal Aid & Human Rights Clinic'], bottom: ['Business Analytics & Case Study Hall', 'Faculty Research Chambers — Law'] },
        1: { top: ['Corporate Law & IP Research Studio', 'Constitutional Law Seminar Hall'], bottom: ['Marketing Simulation & Retail Lab', 'Management Development Cell'] },
        2: { top: ['Cyber Law & Forensic Evidence Lab', 'International Trade Law Chamber'], bottom: ['Executive MBA Smart Seminar Room', 'Finance & Stock Trading Sandbox'] },
        3: { top: ['Law Dean Suite & Colloquium Chamber', 'Arbitration & Mediation Studio'], bottom: ['Management Dean Office & Boardroom', 'Doctoral Scholar Research Hub'] },
      };

      const names = lawRooms[floor] || lawRooms[0];
      const rooms: BlueprintRoom[] = [];
      const prefix = floor === 0 ? 'G' : `${floor}`;

      const topStartX = bounds.x + 175;
      const topWidth = bounds.width - 195;
      const topRoomW = topWidth / 2;
      const topHeight = corridorY - bounds.y - 12;

      names.top.forEach((title, i) => {
        const rx = topStartX + i * topRoomW;
        rooms.push({
          id: `law-${floor}-t${i}`,
          code: `LAW-${prefix}0${i + 1}`,
          name: title,
          areaSqM: 65,
          x: rx,
          y: bounds.y + 12,
          width: topRoomW - 8,
          height: topHeight,
          door: { x: rx + topRoomW * 0.5, y: corridorY, wall: 'bottom', swing: 'right' },
          extinguisherAnchor: { x: rx + 30, y: corridorY - 14 },
        });
      });

      const botRoomW = (bounds.width - 30) / 2;
      const bottomY = corridorY + corridorH + 8;
      const bottomHeight = (bounds.y + bounds.height) - bottomY - 14;

      names.bottom.forEach((title, i) => {
        const rx = bounds.x + 15 + i * botRoomW;
        rooms.push({
          id: `law-${floor}-b${i}`,
          code: `MGMT-${prefix}0${i + 3}`,
          name: title,
          areaSqM: 70,
          x: rx,
          y: bottomY,
          width: botRoomW - 8,
          height: bottomHeight,
          door: { x: rx + botRoomW * 0.5, y: bottomY, wall: 'top', swing: 'left' },
          extinguisherAnchor: { x: rx + botRoomW - 30, y: bottomY + 16 },
        });
      });

      return rooms;
    },
  },

  '5': {
    id: '5',
    name: 'Allied Health Sciences',
    code: 'BLDG-05',
    floors: 3,
    widthM: 68.8,
    depthM: 49.8,
    type: 'health',
    getCorePosition: (bounds) => ({
      stairwell: {
        x: bounds.x + 20,
        y: bounds.y + 20,
        width: 75,
        height: 100,
        treads: 10,
        label: 'FIRE EXIT 01',
      },
      elevator: {
        x: bounds.x + 100,
        y: bounds.y + 20,
        width: 60,
        height: 60,
        label: 'BED LIFT',
      },
      extinguisherAnchor: {
        x: bounds.x + 115,
        y: bounds.y + 100,
      },
    }),
    getFloorRooms: (floor, bounds, corridorY, corridorH) => {
      const healthData: Record<number, { top: string[]; bottom: string[] }> = {
        0: { top: ['Human Anatomy & Physiology Lab', 'Pathology & Microbiology Diagnostic Bay'], bottom: ['Physiotherapy & Rehabilitation Clinic', 'Emergency Simulation & Triage Ward'] },
        1: { top: ['Advanced Nursing Simulation Suite', 'Biochemistry & Hematology Lab'], bottom: ['Radiology & Medical Imaging Lab', 'Clinical Skills Training Center'] },
        2: { top: ['Pharmacy Practice & Dispensing Lab', 'Pharmaceutical Chemistry Research Bay'], bottom: ['Dean Chamber & Faculty Health Council', 'Public Health & Epidemiology Studio'] },
      };

      const roomsData = healthData[floor] || healthData[0];
      const rooms: BlueprintRoom[] = [];
      const prefix = floor === 0 ? 'G' : `${floor}`;

      const topStartX = bounds.x + 175;
      const topWidth = bounds.width - 195;
      const topRoomW = topWidth / 2;
      const topHeight = corridorY - bounds.y - 12;

      roomsData.top.forEach((title, i) => {
        const rx = topStartX + i * topRoomW;
        rooms.push({
          id: `health-${floor}-t${i}`,
          code: `AHS-${prefix}0${i + 1}`,
          name: title,
          areaSqM: 58,
          x: rx,
          y: bounds.y + 12,
          width: topRoomW - 8,
          height: topHeight,
          door: { x: rx + topRoomW * 0.4, y: corridorY, wall: 'bottom', swing: 'left' },
          extinguisherAnchor: { x: rx + 30, y: corridorY - 14 },
        });
      });

      const botRoomW = (bounds.width - 30) / 2;
      const bottomY = corridorY + corridorH + 8;
      const bottomHeight = (bounds.y + bounds.height) - bottomY - 14;

      roomsData.bottom.forEach((title, i) => {
        const rx = bounds.x + 15 + i * botRoomW;
        rooms.push({
          id: `health-${floor}-b${i}`,
          code: `AHS-${prefix}0${i + 3}`,
          name: title,
          areaSqM: 62,
          x: rx,
          y: bottomY,
          width: botRoomW - 8,
          height: bottomHeight,
          door: { x: rx + botRoomW * 0.5, y: bottomY, wall: 'top', swing: 'right' },
          extinguisherAnchor: { x: rx + botRoomW - 30, y: bottomY + 16 },
        });
      });

      return rooms;
    },
  },

  '6': {
    id: '6',
    name: 'Food Court & Canteen',
    code: 'BLDG-06',
    floors: 1,
    widthM: 58.5,
    depthM: 44.3,
    type: 'food_court',
    getCorePosition: (bounds) => ({
      stairwell: {
        x: bounds.x + bounds.width - 80,
        y: bounds.y + 15,
        width: 65,
        height: 75,
        treads: 6,
        label: 'ROOF ACCESS',
      },
      elevator: {
        x: bounds.x + bounds.width - 80,
        y: bounds.y + 95,
        width: 65,
        height: 55,
        label: 'SERVICE HOIST',
      },
      extinguisherAnchor: {
        x: bounds.x + bounds.width - 100,
        y: bounds.y + 85,
      },
    }),
    getFloorRooms: (_floor, bounds, _corridorY, _corridorH) => {
      // Open-plan layout: large central dining seating + kitchen + food counters
      const leftW = bounds.width * 0.62;
      const rightStartX = bounds.x + leftW + 10;
      const rightW = bounds.width - leftW - 25;

      const rooms: BlueprintRoom[] = [
        {
          id: 'food-main-dining',
          code: 'FC-G01',
          name: 'Main Student & Faculty Dining Hall (Cap: 280)',
          areaSqM: 145,
          x: bounds.x + 15,
          y: bounds.y + 15,
          width: leftW - 15,
          height: bounds.height - 30,
          door: { x: bounds.x + leftW * 0.5, y: bounds.y + bounds.height - 15, wall: 'bottom', swing: 'left' },
          extinguisherAnchor: { x: bounds.x + 40, y: bounds.y + 40 },
        },
        {
          id: 'food-kitchen',
          code: 'FC-G02',
          name: 'Commercial Kitchen & High-Temp Fry Bay',
          areaSqM: 42,
          x: rightStartX,
          y: bounds.y + 160,
          width: rightW,
          height: (bounds.height - 180) * 0.55,
          door: { x: rightStartX, y: bounds.y + 190, wall: 'left', swing: 'right' },
          extinguisherAnchor: { x: rightStartX + 25, y: bounds.y + 185 },
        },
        {
          id: 'food-counters',
          code: 'FC-G03',
          name: 'Live Food Counters & Beverage Bar',
          areaSqM: 35,
          x: rightStartX,
          y: bounds.y + 160 + (bounds.height - 180) * 0.55 + 10,
          width: rightW,
          height: (bounds.height - 180) * 0.45 - 10,
          door: { x: rightStartX, y: bounds.y + 280, wall: 'left', swing: 'left' },
          extinguisherAnchor: { x: rightStartX + rightW - 25, y: bounds.y + 270 },
        },
      ];

      return rooms;
    },
  },
};

// ---------------------------------------------------------------------------
// Main Procedural Blueprint Generator
// ---------------------------------------------------------------------------

export function generateBuildingBlueprint(
  buildingId: string | number,
  floorNumber: number = 0
): BuildingBlueprint {
  const bIdStr = String(buildingId).toLowerCase().trim();
  
  // Try direct lookup, or lookup by matching code/name/id from CAMPUS_BUILDINGS
  let archetype = CAMPUS_BLUEPRINT_ARCHETYPES[bIdStr];
  let canonical = getCampusBuilding(bIdStr);

  if (!canonical) {
    // If archetype exists, find canonical building by archetype code/name
    if (archetype) {
      canonical = getCampusBuilding(archetype.code) || getCampusBuilding(archetype.name);
    }
  }

  if (!archetype) {
    if (canonical) {
      archetype = Object.values(CAMPUS_BLUEPRINT_ARCHETYPES).find(
        a => a.code === canonical!.code || a.name.toLowerCase() === canonical!.name.toLowerCase()
      ) || CAMPUS_BLUEPRINT_ARCHETYPES['3'];
    } else {
      archetype = CAMPUS_BLUEPRINT_ARCHETYPES['3'];
    }
  }

  // If canonical is still missing, fallback to first matching building
  if (!canonical) {
    canonical = CAMPUS_BUILDINGS[2]; // Engineering Block
  }

  const clampedFloor = Math.max(0, Math.min(floorNumber, canonical.floors - 1));
  const floorLabel = clampedFloor === 0 ? 'GROUND FLOOR' : `FLOOR ${clampedFloor}`;
  const elevationM = clampedFloor * canonical.floorHeightM;

  // Calculate canvas bounding box preserving the real aspect ratio
  const canvasW = 1000;
  const canvasH = 650;
  const paddingX = 70;
  const paddingY = 60;
  const maxAvailableW = canvasW - paddingX * 2 - 40; // Room for dimensions & title block
  const maxAvailableH = canvasH - paddingY * 2 - 30;

  const aspectRatio = canonical.dimensionsM.width / canonical.dimensionsM.depth;
  let blueprintW = maxAvailableW;
  let blueprintH = blueprintW / aspectRatio;

  if (blueprintH > maxAvailableH) {
    blueprintH = maxAvailableH;
    blueprintW = blueprintH * aspectRatio;
  }

  // Centered position (shifted slightly left to allow space for right inspection panel)
  const boundsX = paddingX + (maxAvailableW - blueprintW) * 0.5;
  const boundsY = paddingY + (maxAvailableH - blueprintH) * 0.5;

  const canvasBounds = {
    x: Math.round(boundsX),
    y: Math.round(boundsY),
    width: Math.round(blueprintW),
    height: Math.round(blueprintH),
  };

  // 1. Generate real footprint polygon coordinates in SVG units
  const { points: footprintPolygonPoints, svgPointsString: footprintSvgPath } = getBuildingSvgPolygon(
    canonical, 
    canvasBounds
  );

  // Compute inner wall offset polygon
  const centerX = canvasBounds.x + canvasBounds.width * 0.5;
  const centerY = canvasBounds.y + canvasBounds.height * 0.5;
  const insetFactor = 0.975;
  const innerWallSvgPath = footprintPolygonPoints.map(p => {
    const ix = Math.round(centerX + (p.x - centerX) * insetFactor);
    const iy = Math.round(centerY + (p.y - centerY) * insetFactor);
    return `${ix},${iy}`;
  }).join(' ');

  // Central corridor spine
  const corridorH = archetype.type === 'food_court' ? 0 : 54;
  const corridorY = Math.round(canvasBounds.y + (canvasBounds.height - corridorH) * 0.5);

  const corridor: BlueprintCorridor = {
    x: canvasBounds.x + 10,
    y: corridorY,
    width: canvasBounds.width - 20,
    height: corridorH,
    label: `CENTRAL EGRESS CORRIDOR — W: 2.40m`,
    anchors: [
      { x: canvasBounds.x + canvasBounds.width * 0.25, y: corridorY + corridorH * 0.5, label: 'Corridor West Station' },
      { x: canvasBounds.x + canvasBounds.width * 0.50, y: corridorY + corridorH * 0.5, label: 'Corridor Central Station' },
      { x: canvasBounds.x + canvasBounds.width * 0.75, y: corridorY + corridorH * 0.5, label: 'Corridor East Station' },
    ],
  };

  // Fixed core (consistent across floors)
  const core = archetype.getCorePosition(canvasBounds);

  // Procedural rooms
  const rooms = archetype.getFloorRooms(clampedFloor, canvasBounds, corridorY, corridorH);

  // Structural columns at regular bay intervals (e.g. 5x3 bay grid)
  const structuralColumns: Array<{ x: number; y: number }> = [];
  const baysX = canonical.dimensionsM.width > 50 ? 5 : 4;
  const baysY = 3;

  for (let ix = 0; ix <= baysX; ix++) {
    const cx = Math.round(canvasBounds.x + (canvasBounds.width * ix) / baysX);
    for (let iy = 0; iy <= baysY; iy++) {
      const cy = Math.round(canvasBounds.y + (canvasBounds.height * iy) / baysY);
      structuralColumns.push({ x: cx, y: cy });
    }
  }

  return {
    buildingId: archetype.id,
    buildingName: canonical.name,
    buildingCode: canonical.code,
    floors: canonical.floors,
    floor: clampedFloor,
    floorLabel,
    floorHeightM: canonical.floorHeightM,
    totalHeightM: canonical.totalHeightM,
    elevationM,
    realDimensionsM: { width: canonical.dimensionsM.width, depth: canonical.dimensionsM.depth },
    aspectRatio,
    canvasBounds,
    footprintPolygonPoints,
    footprintSvgPath,
    innerWallSvgPath,
    corridor,
    core,
    rooms,
    structuralColumns,
    dimensionLabels: {
      topM: `${canonical.dimensionsM.width.toFixed(1)} m`,
      leftM: `${canonical.dimensionsM.depth.toFixed(1)} m`,
    },
  };
}
