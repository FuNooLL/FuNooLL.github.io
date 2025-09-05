(() => {
  const canvas = document.querySelector("canvas"),
  ctx = canvas.getContext("2d"),
  panel2 = document.getElementsByClassName("panel")[0],
  panel = document.getElementsByClassName("panel")[1],
  toggles = document.getElementsByClassName("panel")[0],
  input = document.getElementsByClassName("quantity")[0],
  btnsP = panel.getElementsByClassName("mono-btn"),
  btnsL = panel2.getElementsByClassName("mono-btn"),
  table = document.getElementById("table-container"),
  table1 = document.getElementById("excel-table"),
  btnsH = document.querySelector("header").getElementsByClassName("mono-btn"),
  btnsT = toggles.getElementsByClassName("mono-btn"),
  nodes = [],
  config = {
    bgColor         : "rgba(17, 17, 22, 1)",
    nodeColor       : opacity => "rgba(240, 255, 255, "+opacity+")",  // this is function!
    selectColor     : "rgba(110, 110, 120, 1)",
    startNodeColor  : "rgba(60, 200, 10, 1)",
    endNodeColor    : "rgba(235, 10, 10, 1)",
    headerHeight      : 40,
    nodeRadius      : null,    // radius value by certain w and h
    totalNodeCount  : 15,
    nodeCount       : 0,
    middleEdgeLegth : null,   // value by certain w and h
    maxNodeVelocity : 1.2,
    speedK          : 0.32,  // speed constant
    maxEdges        : 3,
    pointerAura     : null,  // also value by certain w and h
    searchingSpeed  : 90,  //   1/speed
  },
  ratios = {
    nodeRadius     : 0.05,
    pointerAura    : 0.080,
    middleEdgeLegth: 0.3,
    font           : 0.063,
  },
  pathConfig = {
    NO: 0, YES: 1, WAIT: 2, COMPLETED: 3, QUEUE: 4,
    yesColor: "rgba(100, 150, 215, 1)",
    waitColor: "rgba(50, 100, 150, 1)",
    completedColor: "rgba(210, 210, 50, 1)",
    queueColor: "rgba(120, 120, 120, 1)",
  },
  pointer = {x: 0, y: 0, isdown: false, selectedItem: null, startPos: {x: 0, y: 0}};
  let w, h, cw, ch, minWH,
  startNode = null,
  endNode = null,
  path = [],
  searching = null,
  BETTER_EDGES = false,
  DIRECTED = false;
  
  
  
  function resize() {
    w = canvas.width = innerWidth+1;
    h = canvas.height = innerHeight-config.headerHeight;
    //config.headerHeight = parseInt(document.querySelector("header").style.width);
    cw = w/2;
    ch = h/2;
    minWH = Math.max(Math.min(w, h), 300);
    ctx.font = `${ratios.font*minWH}px sans-serif`;
    config.nodeRadius = ratios.nodeRadius*minWH;
    config.middleEdgeLegth = ratios.middleEdgeLegth*minWH;
    config.pointerAura = Math.pow(config.nodeRadius+ratios.pointerAura*minWH, 2);
    panel2.style.top = config.headerHeight+1+"px";
  } resize(); window.onresize = resize;
  console.log(config.nodeRadius);
  
  // Transform coordinates
  
  function tx(x) {return x + cw;} 
  function ty(y) {return y + ch;}
  
  function xt(x) {return x - cw;} 
  function yt(y) {return y - ch;}
  
  /* ----- Classes ----- */
  
  class Edge {
    constructor(mother, direction, weight) {
      this.mother = mother;
      this.weight = weight ? weight : Math.random();
      this.direction = direction;
      this.drawValue = Math.random()*Math.PI;
      this.cycle = false;
      if (mother === direction) {
        this.cycle = true;
        let angle = 1+Math.random()*1.5;
        this.startCycle = {x: Math.cos(this.drawValue)*config.middleEdgeLegth, y: Math.sin(this.drawValue)*config.middleEdgeLegth};
        this.endCycle = {x: Math.cos(this.drawValue+angle)*config.middleEdgeLegth, y: Math.sin(this.drawValue+angle)*config.middleEdgeLegth};
      }
      this.inPath = pathConfig.NO;
      this.friend = this;
    }
    
    static _new(mother, direction, weight) {
      if (mother.edges.filter(e => e.direction === direction).length) return;
      if (!DIRECTED) {if (direction.edges.filter(e => e.direction === mother).length) return;}
      if (weight == 0) return;
      
      let edge1 = new Edge(mother, direction, weight);
      mother.edges.push(edge1);
      if (!DIRECTED) {
        if (mother === direction) return;
        let edge2 = new Edge(direction, mother, weight);
        edge1.friend = edge2;
        edge2.friend = edge1;
        direction.edges.push(edge2);}
    }
    
    draw() {
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.mother.x, this.mother.y);
      
      if (!this.cycle) {
        if (BETTER_EDGES) {
          let xdiff = this.mother.x - this.direction.x,
          ydiff = this.mother.y - this.direction.y;
          let length = Math.sqrt(xdiff*xdiff + ydiff*ydiff);
          xdiff /= length;
          ydiff /= length;
          let [middleX, middleY] = [(this.direction.x + this.mother.x)/2, (this.direction.y + this.mother.y)/2];
          let middleXp = middleX - ydiff*this.drawValue*2,
          middleYp = middleY + xdiff*this.drawValue*2;
          ctx.quadraticCurveTo(middleXp, middleYp, this.direction.x, this.direction.y);
          middleX = (middleX+middleXp)/2;
          middleY = (middleY+middleYp)/2;
          ctx.moveTo(middleX, middleY);
          ctx.lineTo(middleX + (xdiff - ydiff)*3, middleY + (ydiff + xdiff)*3);
        } else {
          ctx.lineTo(this.direction.x, this.direction.y);
        }
      } else {
        ctx.bezierCurveTo(
          this.mother.x + this.startCycle.x, this.mother.y + this.startCycle.y, 
          this.mother.x + this.endCycle.x, this.mother.y + this.endCycle.y,
          this.mother.x+1, this.mother.y+1
          );
      }
      
      //ctx.closePath();
      if (this.inPath == pathConfig.WAIT) {
        ctx.strokeStyle = pathConfig.waitColor;
      } else if (this.inPath == pathConfig.YES) {
        ctx.strokeStyle = pathConfig.yesColor;
      } else if (this.inPath == pathConfig.COMPLETED) {
        ctx.strokeStyle = pathConfig.completedColor;
      } else if (this.inPath == pathConfig.QUEUE) {
        ctx.strokeStyle = pathConfig.queueColor;
      } else ctx.strokeStyle = config.nodeColor(Math.max(Math.min(this.weight, 1), 0));
      ctx.stroke();
    }
  }
  
  let Node_isTouchedNode = false, Node_timer1=0;
  class Node {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.tx = xt(x);
      this.ty = yt(y);
      this.velocityX = 0;
      this.velocityY = 0;
      
      this.edges = [];
      
      this.inPath = 0;
      this.mother = null;  // only for search path Algoritm
      this.id = (config.nodeCount++ < 25 ? String.fromCharCode(64 + config.nodeCount) : ""+(config.nodeCount-24));
    }
    
    updatePos() {
      this.x = tx(this.tx), this.y = ty(this.ty);
    }
    
    setEdges() {
      let direction, edge, rnd;
      rnd = Math.round(Math.random()*config.maxEdges);
      for (let i = 0; i < rnd; i++) {
        direction = nodes[Math.floor(Math.random() * nodes.length)];
        Edge._new(this, direction);
      }
    }
    
    getSpeed(length) {
      length /= config.middleEdgeLegth;
      return (length - 1/length) * config.middleEdgeLegth * config.speedK;
    }
    
    determinatePos() {
      let length, speed,
      xdiff, ydiff, other,
      velocityX, velocityY,
      flag, edge, edgesLength, otherEdgesLength;
      
      edgesLength = this.edges.length;
      if (this.edges.length == 0) edgesLength = 1; 
      
      for (let i in nodes) {
        flag = true;
        other = nodes[i];
        if (other == this) continue;

        otherEdgesLength = other.edges.length;
        if (otherEdgesLength == 0) otherEdgesLength = 1;
        
        xdiff = other.x - this.x;
        ydiff = other.y - this.y;
        
        length = Math.sqrt(xdiff * xdiff + ydiff * ydiff);
        if (length < 0.01) {
          length = 0.01;
          this.x += config.nodeRadius;
          this.y += config.nodeRadius;
        }
        if (xdiff == 0) xdiff = 0.001;
        if (ydiff == 0) ydiff = 0.001;
        
        velocityX = xdiff/length;
        velocityY = ydiff/length;
        speed = this.getSpeed(length);
        
        for (let j in this.edges) {
          edge = this.edges[j];
          if (edge.direction == other) {
            flag = false;
            this.velocityX += velocityX * speed / edgesLength * edge.weight;
            this.velocityY += velocityY * speed / edgesLength * edge.weight;
            other.velocityX -= velocityX * speed / otherEdgesLength * edge.weight;
            other.velocityY -= velocityY * speed / otherEdgesLength * edge.weight;
            break;
          }
        }
        if (flag && length - config.middleEdgeLegth < 0) {
          this.velocityX += velocityX * speed / edgesLength;
          this.velocityY += velocityY * speed / edgesLength;
          other.velocityX -= velocityX * speed / otherEdgesLength;
          other.velocityY -= velocityY * speed / otherEdgesLength;
        }
      }
      this.velocityX /= edgesLength * 2;
      this.velocityY /= edgesLength * 2;
      this.velocityX = Math.max(Math.min(config.maxNodeVelocity, this.velocityX), -config.maxNodeVelocity);
      this.velocityY = Math.max(Math.min(config.maxNodeVelocity, this.velocityY), -config.maxNodeVelocity);
      if (this.velocityX < 0.05 && this.velocityX > -0.05) this.velocityX = 0;
      if (this.velocityY < 0.05 && this.velocityY > -0.05) this.velocityY = 0;
      
      if (this.x < 0) this.velocityX = Math.abs(this.velocityX);
      if (this.y < 0) this.velocityY = Math.abs(this.velocityY);
      if (this.x > w) this.velocityX = -Math.abs(this.velocityX);
      if (this.y > h) this.velocityY = -Math.abs(this.velocityY);
      this.tx += this.velocityX;
      this.ty += this.velocityY;
      this.updatePos();
    }
    
    static pointerInteraction() {
      if (pointer.selectedItem) {
        if (pointer.isdown) {
          pointer.selectedItem.tx = xt(pointer.x + 5);
          pointer.selectedItem.ty = yt(pointer.y + 5);
          pointer.selectedItem.velocityX = 0;
          pointer.selectedItem.velocityY = 0;
          pointer.selectedItem.updatePos();
        } else {
          Node.timer1++;
          if (Node_timer1 >= 1200) {
            pointer.selectedItem = null;
            disactivatePanel();
            Node_timer1 = 0;
            return;
          }
          if (Node_isTouchedNode && Math.abs(pointer.x - pointer.startPos.x) < config.nodeRadius && Math.abs(pointer.y - pointer.startPos.y) < config.nodeRadius) activatePanel();
          Node_isTouchedNode = false;
        }
        ctx.beginPath();
        ctx.arc(pointer.selectedItem.x, pointer.selectedItem.y, config.nodeRadius*2, 0, Math.PI*2);
        ctx.strokeStyle = config.selectColor;
        ctx.stroke();
        ctx.closePath();
        return;
      } else Node.timer1 = 0;
      if (!pointer.isdown) {
        if (Node_isTouchedNode && Math.abs(pointer.x - pointer.startPos.x) < config.nodeRadius && Math.abs(pointer.y - pointer.startPos.y) < config.nodeRadius) activatePanel();
        Node_isTouchedNode = false;
        return;
      }
      
      let node, xdiff, ydiff;
      for (let i in nodes) {
        node = nodes[i];
        xdiff = node.x - pointer.x;
        ydiff = node.y - pointer.y;
        if (xdiff*xdiff+ydiff*ydiff < config.pointerAura) {
          pointer.selectedItem = node;
          Node_isTouchedNode = true;
          return;
        }
      }
      Node_isTouchedNode = false;
    }
    
    draw() {
      for (let i in this.edges) this.edges[i].draw();
      ctx.beginPath();
      ctx.arc(this.x, this.y, config.nodeRadius, 0, Math.PI * 2);
      ctx.closePath();
      if (this === startNode) ctx.fillStyle = config.startNodeColor;
      else if (this === endNode) ctx.fillStyle = config.endNodeColor;
      else if (this.inPath == pathConfig.WAIT)
        ctx.fillStyle = pathConfig.waitColor;
      else if (this.inPath == pathConfig.YES)
        ctx.fillStyle = pathConfig.yesColor;
      else if (this.inPath == pathConfig.COMPLETED)
        ctx.fillStyle = pathConfig.completedColor;
      else if (this.inPath == pathConfig.QUEUE)
        ctx.fillStyle = pathConfig.queueColor;
      else ctx.fillStyle = config.nodeColor(1);
      ctx.fill();
      ctx.textAlign = "center";
      ctx.lineWidth = 2;
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(10, 10, 10, 1)";
      ctx.fillText(this.id, this.x, this.y);
    }
  }
  
  
  /* ----- Functions ----- */
  
  
  function* searchPath() {
    if (!startNode) return;
    let queue = [[startNode, 0]];
    startNode.mother = {friend: {}};
    let end = endNode;
    let node, way;
    
    for (let node of path) {
      node[0].inPath = pathConfig.NO;
      node[0].mother.inPath = pathConfig.NO;
      if (!DIRECTED) node[0].mother.friend.inPath = pathConfig.NO;
      tableDeleteColumn();
    }
    
    path = [];
    
    while (queue.length) {
      [node, way] = queue.shift();
      node.inPath = pathConfig.WAIT;
      node.mother.inPath = pathConfig.WAIT;
      if (node === end) {
        tableAddColumn(node.id);
        path.push([node, way]);
        
        if (!DIRECTED) node.mother.friend.inPath = pathConfig.YES;
        
        for (let node1 of queue) {
          node1[0].inPath = pathConfig.NO;
          node1[0].mother.inPath = pathConfig.NO;
          if (!DIRECTED) node1[0].mother.friend.inPath = pathConfig.NO;
        }
        
        for (let node1 of path) {
          node1[0].inPath = pathConfig.NO;
          node1[0].mother.inPath = pathConfig.NO;
          if (!DIRECTED) node1[0].mother.friend.inPath = pathConfig.NO;
        }
        tableDeleteColumns(path.length);
        path.splice(0, path.length-1);
        //tableAddColumn(node.id);
        let i = 0;
        while (node) {
          node.inPath = pathConfig.COMPLETED;
          if (!node.mother || node.mother.mother === node) break;
          node.mother.inPath = pathConfig.COMPLETED;
          tableAddColumn(node.id);
          path.push([node, way]);
          if (!DIRECTED) node.mother.friend.inPath = pathConfig.COMPLETED;
          tableUpdate(i++, way.toFixed(2), node.mother.mother ? node.mother.mother.id : "");
          way -= node.mother ? (1-node.mother.weight) : 0;
          node = node.mother.mother;
        }
        //startNode.mother = null;
        return;
      }
      
      let temp1, temp2;
      node.edges.sort((a, b) => b.weight - a.weight);
      for (let edge1 of node.edges) {
        if (edge1.direction === node) continue;
        if (path.find(e => e[0] === edge1.direction)) continue;
        temp1 = queue.find(e => edge1.direction === e[0]);
        temp2 = way + (1-edge1.weight);
        if (!temp1) {
          edge1.direction.mother = edge1;
          edge1.direction.inPath = pathConfig.QUEUE;
          queue.push([edge1.direction, temp2]);
        } else {
          if (temp1[1] > temp2) {
            temp1[1] = temp2;
            temp1[0].mother = edge1;
          }
        }
      }
      tableAddColumn(node.id);
      tableUpdate(path.length, way.toFixed(2), node.mother.mother ? node.mother.mother.id : "");
      path.push([node, way]);
      yield;
      node.inPath = pathConfig.YES;
      node.mother.inPath = pathConfig.YES;
      if (!DIRECTED) node.mother.friend.inPath = pathConfig.YES;
    }
    tableDeleteColumns(path.length);
    for (let node1 of path) {
      node1[0].inPath = pathConfig.NO;
      node1[0].mother.inPath = pathConfig.NO;
      if (!DIRECTED) node1[0].mother.friend.inPath = pathConfig.NO;
    }
    path.splice(0, path.length);
    //startNode.mother = null;
    return;
  }
  

  function tableUpdate(i, data1, data2) {
    //"<span style='color: #555555;'> </span>"
    //table1.rows[1].cells[i+1].textContent
    table1.rows[1].cells[i+1].innerText = data1;
    table1.rows[2].cells[i+1].innerText = data2;
  }
  
  function tableAddColumn(name) {
    const isInEnd = table.scrollLeft >= (table.scrollWidth - table.clientWidth - 5);
    const header = table.querySelector('thead tr');
    const rows = table.querySelectorAll('tbody tr');
    const colCount = header.children.length;
    //const newLetter = String.fromCharCode(64 + colCount); // A=65, B=66...
    
    header.insertAdjacentHTML('beforeend', `<th>${name}</th>`);
    
    rows.forEach(row => {
      row.insertAdjacentHTML('beforeend', '<td></td>');
    });
    if (isInEnd) table.scrollLeft = table.scrollWidth;
  }
  
  function tableDeleteColumn() {
    const header = table.querySelector('thead tr');
    const rows = table.querySelectorAll('tbody tr');
    
    if (header.children.length > 1) {
    header.removeChild(header.lastElementChild);
    rows.forEach(row => {
      row.removeChild(row.lastElementChild);
    });
    }
  }
  
  function tableAddStroke() {
    const tbody = table.querySelector('tbody');
    const rowCount = tbody.children.length + 1;
    const colCount = table.querySelector('thead tr').children.length - 1;
    
    let newRow = `<tr><td class="row-header">${rowCount}</td>`;
    for (let i = 0; i < colCount; i++) {
      newRow += '<td></td>';
    }
    newRow += '</tr>';
    
    tbody.insertAdjacentHTML('beforeend', newRow);
  }
  
  function tableDeleteStroke() {
    const tbody = table.querySelector('tbody');
    if (tbody.children.length > 1) {
    tbody.removeChild(tbody.lastElementChild);
    }
  }
  
  function tableDeleteColumns(number) {
    for (let i=0; i<number; i++) tableDeleteColumn();
  }
  
  
  let blockPanel = false;
  function activatePanel() {
    if (blockPanel) return;
    panel.hidden = false;
    if (pointer.x + panel.offsetWidth > w) {
      panel.style.left = ""+(pointer.x - panel.offsetWidth-5)+"px";
    } else panel.style.left = ""+(pointer.x+5)+"px";
    
    if (pointer.y + panel.offsetHeight + config.headerHeight > h) {
      panel.style.top = ""+(pointer.y - panel.offsetHeight + config.headerHeight-5)+"px";
    } else panel.style.top = ""+(pointer.y+config.headerHeight+5)+"px";
  }
  function disactivatePanel() {if (blockPanel) return; panel.hidden = true;}
  
  function activateList() {
    panel2.hidden = false;
  }
  function disactivateList() {panel2.hidden = true;}
  
  {let func1;
  function activateInput(func) {
    func1 = func;
    input.hidden = false;
    input.style.left = ""+((pointer.selectedItem.x+input.offsetWidth) < w ? pointer.selectedItem.x : pointer.selectedItem.x-input.offsetWidth)+"px";
    input.style.top = ""+(pointer.selectedItem.y+config.headerHeight)+"px";
  }
  function disactivateInput() {
    input.hidden = true; 
    if (func1) func1(parseFloat(input.value));
    func1 = null;
  }
  }
  
  function activateToggles() {
    toggles.hidden = false;
    toggles.style.right = "0px";
    toggles.style.top = ""+(config.headerHeight-5)+"px";
  }
  function disactivateToggles() {toggles.hidden = true;}
  
  function activateTable() {table.hidden = false;}
  function disactivateTable() {table.hidden = true;}
  
  
  function drawBackground() {
    ctx.fillStyle = config.bgColor;
    ctx.fillRect(0, 0, w, h);
  }
  
  function drawNodes() {
    for (let i in nodes) {
      nodes[i].draw();
      nodes[i].determinatePos();
    }
    Node.pointerInteraction();
  }
  
  let f = 50000, fp = 0;
  let d = DIRECTED, f2=false;
  let isDone = false;
  function loop() {
    drawBackground();
    drawNodes();
    if (searching && !isDone && f % config.searchingSpeed == 0) {
      isDone = searching.next().done;
      if (isDone) {searching = null; fp = f;}
    }
    if (isDone && f-fp == 800) {
      fp = 0;
      f2 = false;
      isDone = false;
      for (let node of path) {
        if (!node[0]) continue;
        node[0].inPath = pathConfig.NO;
        if (node[0].mother) node[0].mother.inPath = pathConfig.NO;
        if (!DIRECTED && node[0].mother) node[0].mother.friend.inPath = pathConfig.NO;
      }
      tableDeleteColumns(path.length);
      path.splice(0, path.length);
    }
    f++;
    if (DIRECTED != d) {d = DIRECTED; init();}
    requestAnimationFrame(loop);
  }
  
  function init() {
    config.nodeCount = 0;
    nodes.splice(0, nodes.length);
    tableDeleteColumns(path.length);
    path.splice(0, path.length);
    searching = null;
    
    for (let i = 1; i < config.totalNodeCount; i++) {
      nodes.push(new Node(cw, ch));
      //nodes[i].setEdges();
    }
    nodes.push(new Node(cw+1, ch));
    for (let i = 0; i < config.totalNodeCount; i++) {
      nodes[i].setEdges();
    }
    disactivatePanel();
    disactivateToggles();
    disactivateInput();
    disactivateList();
    disactivateTable();
  }
  
  
  /* ----- Events ----- */
  
  input.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;
    disactivateInput();
  });
  
  btnsH[0].addEventListener("click", () => {
    if (searching) return;
    searching = searchPath();
    fp = 0;
    f2 = false;
    isDone = false;
    for (let node of path) {
      node[0].inPath = pathConfig.NO;
      if (node[0].mother) node[0].mother.inPath = pathConfig.NO;
      if (!DIRECTED && node[0].mother) node[0].mother.friend.inPath = pathConfig.NO;
    }
    tableDeleteColumns(path.length);
    path.splice(0, path.length);
  });
  {let toggle = true;
  btnsH[1].addEventListener("click", () => {
    if (toggle) {toggle = false; BETTER_EDGES=false; DIRECTED=false;}
    else {toggle = true; BETTER_EDGES=true; DIRECTED=true;}
  });
  }
  btnsH[2].addEventListener("click", () => {
    if (panel2.hidden) activateList();
    else disactivateList();
  });
  
  btnsL[0].addEventListener("click", () => {
    disactivateList();
    config.nodeCount = 0;
    nodes.splice(0, nodes.length);
    nodes.push(new Node(cw, ch));
    pointer.selectedItem = startNode = endNode = null;
  });
  btnsL[1].addEventListener("click", () => {
    disactivateList();
    if (table.hidden) activateTable();
    else disactivateTable();
  });
  
  btnsP[0].addEventListener("click", () => {
    disactivatePanel();
    if (searching) return;
    if (pointer.selectedItem === startNode) {
      startNode = null; return;
    }
    if (pointer.selectedItem === endNode) endNode = null;
    startNode = pointer.selectedItem;
    panel.hidden = true;
  }); // Set start point
  btnsP[1].addEventListener("click", () => {
    disactivatePanel();
    if (searching) return;
    if (pointer.selectedItem === endNode) {
      endNode = null; return;
    }
    if (pointer.selectedItem === startNode) startNode = null;
    endNode = pointer.selectedItem;
    panel.hidden = true;
  }); // Set end point
  btnsP[2].addEventListener("click", () => {
    // Add node
    disactivatePanel();
    let selected = pointer.selectedItem;
    let node = new Node(selected.x, selected.y);
    
    activateInput(value => {
      nodes.push(node);
      config.nodeCount++;
      if (isNaN(value)) return;
      Edge._new(selected, node, Math.min(Math.max(value/100, 0), 1));
    })
  }); // Add node
  btnsP[3].addEventListener("click", () => {
    // Delete node
    disactivatePanel();
    config.nodeCount--;
    nodes.splice(nodes.indexOf(pointer.selectedItem), 1);
    for (let i in nodes) {
      for (let j=nodes[i].edges.length-1; j>=0; j--) {
        if (nodes[i].edges[j].direction === pointer.selectedItem) {
          nodes[i].edges.splice(j, 1);
        }
      }
    }
  }); // Delete node
  {let startEdgeNode = null, flag = false;
  btnsP[4].addEventListener("click", () => {
    // Add edges
    disactivatePanel();
    if (flag) return;
    let span = btnsP[4].querySelector("span");
    if (!startEdgeNode) {startEdgeNode = pointer.selectedItem; span.textContent = "End edge";
    } else {
      flag = true;
      activateInput(value => {
        Edge._new(startEdgeNode, pointer.selectedItem, Math.min(Math.max(value/100, 0), 1));
        startEdgeNode = null;
        flag = false;
      })
      span.textContent = "Start edge";
    }
  });} // Add edges
  {let startEdgeNode = null;
  btnsP[5].addEventListener("click", () => {
    // Delete edges
    disactivatePanel();
    let span = btnsP[5].querySelector("span");
    let queue = [];
    
    if (!startEdgeNode) {startEdgeNode = pointer.selectedItem; span.textContent = "To";
    return;}
    for (let i in startEdgeNode.edges) {
      if (startEdgeNode.edges[i].direction === pointer.selectedItem) {
        queue.unshift(i);
        if (!DIRECTED) {
          for (let e in pointer.selectedItem.edges) {
            if (pointer.selectedItem.edges[e].direction === startEdgeNode) {pointer.selectedItem.edges.splice(e, 1); break}
          }
        }
      }
    }
    for (let i in queue) {
      startEdgeNode.edges.splice(queue[i], 1)
    }
    startEdgeNode = null;
    span.textContent = "Delete edge from";
  });} // Delete edges
  
  canvas.addEventListener("pointermove", event => {
    pointer.x = event.layerX;
    pointer.y = event.layerY;
  });
  canvas.addEventListener("pointerdown", event => {
    pointer.selectedItem = null;
    pointer.isdown = true;
    pointer.x = event.layerX;
    pointer.y = event.layerY;
    pointer.startPos.x = pointer.x;
    pointer.startPos.y = pointer.y;
    disactivatePanel();
    disactivateToggles();
    disactivateList();
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener("pointerup",   event => {
    //if (event.target != canvas) return;
    pointer.isdown = false;
    canvas.style.cursor = 'default';
  });
  
  init();
  loop();
})()