let table;
let data = [];

let dSlider, eSlider, vSlider;

let popularityThreshold = 0; // 95th percentile

function preload() {
  table = loadTable('100Spotify.csv', 'csv', 'header');
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  let cols = table.columns;

  let idCol = cols.find(c => c.toLowerCase().includes('id'));
  let dCol = cols.find(c => c.toLowerCase().includes('dance'));
  let eCol = cols.find(c => c.toLowerCase().includes('energy'));
  let vCol = cols.find(c => c.toLowerCase().includes('valence'));
  let pCol = cols.find(c => c.toLowerCase().includes('pop'));

  let seen = new Set();

  let step = 15; // performance

  for (let i = 0; i < table.getRowCount(); i += step) {
    let row = table.getRow(i);

    let id = row.get(idCol);
    if (seen.has(id)) continue;
    seen.add(id);

    let d = +row.get(dCol);
    let e = +row.get(eCol);
    let v = +row.get(vCol);
    let p = +row.get(pCol);

    if (!isNaN(d) && !isNaN(e) && !isNaN(v) && !isNaN(p)) {
      data.push({ d, e, v, p });
    }
  }

  // 🔥 calculate 95th percentile
  let sorted = data.map(d => d.p).sort((a, b) => a - b);
  popularityThreshold = sorted[Math.floor(0.95 * sorted.length)];

  // sliders
  dSlider = createSlider(0, 1, 0.7, 0.01);
  eSlider = createSlider(0, 1, 0.7, 0.01);
  vSlider = createSlider(0, 1, 0.5, 0.01);

  positionSliders();

  dSlider.input(redraw);
  eSlider.input(redraw);
  vSlider.input(redraw);

  noLoop();
}

function draw() {
  background(245);

  translate(width / 2, 150);

  let scale = 400;

  let dVal = dSlider.value();
  let eVal = eSlider.value();
  let vVal = vSlider.value();

  // depth sorting
  data.sort((a, b) => a.e - b.e);

  

  // grid
  stroke(220);
  for (let i = 0; i <= 1; i += 0.1) {
    let a = iso(0, i, scale);
    let b = iso(1, i, scale);
    line(a.x, a.y, b.x, b.y);

    let c = iso(i, 0, scale);
    let d = iso(i, 1, scale);
    line(c.x, c.y, d.x, d.y);
  }

  noStroke();

  // DRAW PEOPLE
  data.forEach(pt => {

    let dx = pt.d - dVal;
    let dy = pt.e - eVal;
    let dv = pt.v - vVal;

    let distVal = dx * dx + dy * dy + dv * dv;

    let pos = iso(pt.v, pt.d, scale);

    let col = lerpColor(
      color(0, 100, 255),   // low energy → blue
      color(255, 210, 0),    // high energy → orange/red
     pt.e
  );

    let isTop = pt.p >= popularityThreshold;

    // 👇 INSIDE CLUSTER
    if (distVal < 0.08) {

      let count = floor(map(pt.p, 0, 100, 1, 5));
      let spread = map(pt.d, 0, 1, 20, 5);

      for (let i = 0; i < count; i++) {
        if (random() > pt.p / 100) continue;

        let offsetX = random(-spread, spread);
        let offsetY = random(-spread, spread);

        drawPerson(
      pos.x + offsetX,
      pos.y + offsetY,
      isTop ? color(255, 0, 0) : col,
      isTop
    );
      }

    } else {

      // 👀 OUTSIDE CROWD (uneven + faded)

      if (random() > 0.08) return;

      let side = floor(random(4));
      let margin = 0.12;
      let jitter = 0.08;

      let xVal, yVal;

      if (side === 0) {
        xVal = random(-margin, 1 + margin);
        yVal = -margin + random(-jitter, jitter);
      } else if (side === 1) {
        xVal = random(-margin, 1 + margin);
        yVal = 1 + margin + random(-jitter, jitter);
      } else if (side === 2) {
        xVal = -margin + random(-jitter, jitter);
        yVal = random(-margin, 1 + margin);
      } else {
        xVal = 1 + margin + random(-jitter, jitter);
        yVal = random(-margin, 1 + margin);
      }

      let outside = iso(xVal, yVal, scale);

      push();
      stroke(120, 120, 120, 50); // more faded
      strokeWeight(1);
      translate(outside.x, outside.y);
      drawStick(1);
      pop();
    }
  });

  resetMatrix();
  drawUI();
}

// ISO
function iso(x, y, scale) {
  return {
    x: (x - y) * scale,
    y: (x + y) * scale * 0.5
  };
}

// PERSON
function drawPerson(x, y, col, isTop) {
  push();
  translate(x, y);

  let scaleH = isTop ? 3.5 : 1; // 🔥 bigger difference

  if (isTop) {
    // 🔴 TOP SONGS → strong highlight
    stroke(255,20,0);
    strokeWeight(2);

    // subtle glow effect
    for (let i = 0; i < 2; i++) {
      stroke(255,20,0, 40);
      strokeWeight(3);
      drawStick(scaleH);
    }

  } else {
    // normal songs
    stroke(col);
    strokeWeight(1.5);
  }

  // main drawing
  drawStick(scaleH);

  pop();
}

// STICK
function drawStick(scaleH = 1) {
  ellipse(0, -6 * scaleH, 4);
  line(0, -4 * scaleH, 0, 4 * scaleH);
  line(-3, -1 * scaleH, 3, -1 * scaleH);
  line(0, 4 * scaleH, -2, 8 * scaleH);
  line(0, 4 * scaleH, 2, 8 * scaleH);
}

// UI
function drawUI() {
  fill(0);
  textAlign(LEFT);

  let uiY = height * 0.15;

  text("D: " + dSlider.value().toFixed(2), width * 0.75, uiY - 10);
  text("E: " + eSlider.value().toFixed(2), width * 0.75, uiY + 30);
  text("V: " + vSlider.value().toFixed(2), width * 0.75, uiY + 70);

  text("Valence → X axis (mood)", width * 0.75, height * 0.65);
  text("Danceability → Y axis (movement)", width * 0.75, height * 0.70);
  text("Energy → color (intensity)", width * 0.75, height * 0.75);
  text("Popularity → crowd + height", width * 0.75, height * 0.80);
}

// sliders
function positionSliders() {
  let uiY = height * 0.15;

  dSlider.position(width * 0.75, uiY);
  eSlider.position(width * 0.75, uiY + 40);
  vSlider.position(width * 0.75, uiY + 80);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  positionSliders();
}