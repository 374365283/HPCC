/* June-2018
 * Tommy Dang (on the HPCC project, as Assistant professor, iDVL@TTU)
 *
 * THIS SOFTWARE IS BEING PROVIDED "AS IS", WITHOUT ANY EXPRESS OR IMPLIED
 * WARRANTY.  IN PARTICULAR, THE AUTHORS MAKE NO REPRESENTATION OR WARRANTY OF ANY KIND CONCERNING THE MERCHANTABILITY
 * OF THIS SOFTWARE OR ITS FITNESS FOR ANY PARTICULAR PURPOSE.
 */


// Set the dimensions of the canvas / graph
var margin = {top: 5, right: 0, bottom: 50, left: 0};

var svg = d3.select("svg"),
    width = +document.getElementById("mainBody").offsetWidth,
    height = +svg.attr("height")-margin.top-margin.bottom,
    heightdevice = + document.getElementById("mainBody").offsetHeight,

svg = svg
    .attrs({
        width: width,
    })
    .append("g")
    .attr("transform",
        "translate(" + margin.left + "," + margin.top + ")");
var svgStore={};
var svgsum;
//.call(d3.zoom()
//    .scaleExtent([1, 8])
//    .on("zoom", zoom));
//function zoom() {
//   svg.attr("transform", d3.event.transform);
//}


// Parse the date / time
var parseTime = d3.timeParse("%m/%d/%y");

// Set the ranges
var x = d3.scaleTime().range([0, width-margin.left*2]);
var xNew = d3.scaleTime().range([0, width/2-margin.left]);

var y = d3.scaleLinear().range([height, 0]);
var yAxis= d3.scaleLinear().range([height, 0]);

// HPCC
var hosts = [];
var hostResults = {};
var links =[];
var node,link;

// log variable
var timelog=[];

// START: loader spinner settings ****************************
var opts = {
    lines: 25, // The number of lines to draw
    length: 15, // The length of each line
    width: 5, // The line thickness
    radius: 25, // The radius of the inner circle
    color: '#f00', // #rgb or #rrggbb or array of colors
    speed: 2, // Rounds per second
    trail: 50, // Afterglow percentage
    className: 'spinner', // The CSS class to assign to the spinner
};
var target = document.getElementById('loadingSpinner');
var spinner;
// END: loader spinner settings ****************************

var simulation, link, node;
var dur = 400;  // animation duration
var startDate = new Date("4/1/2018");
var endtDate = new Date("1/1/2019");
var today = new Date();

var maxHostinRack= 60;//60;
var h_rack = 1100;//980;
var w_rack = (width-23)/10-1-4;
var w_gap =0;
var node_size = 6;
var sHeight=280;  // Summary panel height
var top_margin = sHeight+46;  // Start rack spiatial layout


var users = [];
var racks = [];
var racksnewor = [];

var xTimeScale;
var baseTemperature =60;

var interval2;
var simDuration =0;
var simDurationinit = 0;
var numberOfMinutes = 26*60;

var iterationstep = 1;
var maxstack =30;
var normalTs =0.6; //time sampling
// var timesteppixel = 0.1; // for 4
var timesteppixel = 0.1; // for 26

var isRealtime = false;
var db = 'nagios';
if (isRealtime){
    simDuration = 1000;
    simDurationinit = 1000;
    numberOfMinutes = 26*60;
}

var currentMiliseconds;
var query_time;
var lastIndex;
var currentHostname,currentMeasure;
var currentHostX = 0;
// var currentHosty = 0;

var charType = "Heatmap";
var sumType = "Radar";
let globalTrend = false;
//***********************
var serviceList = ["Temperature","Job_load","Memory_usage","Fans_speed","Power_consum"];
var serviceListattr = ["arrTemperature","arrCPU_load","arrMemory_usage","arrFans_health","arrPower_usage"];
var serviceQuery ={
    nagios: ["temperature","cpu+load" ,"memory+usage" ,"fans+health" ,"power+usage"],
    influxdb: ["cpu_temperature","cpu+load" ,"memory+usage" ,"fan_speed" ,"system_power_usage"],
};
var serviceAttr = {arrTemperature: {key: "Temperature", val: ["arrTemperatureCPU1","arrTemperatureCPU2"]},
    arrCPU_load: {key: "CPU_load", val: ["arrCPU_load"]},
    arrMemory_usage: {key: "Memory_usage", val: ["arrMemory_usage"]},
    arrFans_health: {key: "Fans_speed", val: ["arrFans_speed1","arrFans_speed2"]},
    arrPower_usage:{key: "Power_consumption", val: ["arrPower_usage"]}};
var thresholds = [[3,98], [0,10], [0,99], [1050,17850],[0,200] ];
var initialService = "Temperature";
var selectedService;


var arrThresholds;
var dif, mid,left;
var color,opa;
//var arrColor = ['#00c', '#1a9850','#fee08b', '#d73027'];
var arrColor = ['#110066','#4400ff', '#00cccc', '#00dd00','#ffcc44', '#ff0000', '#660000'];
setColorsAndThresholds(initialService);

//********tooltip***************
var niceOffset = true;
//***********************
var undefinedValue = undefined;
var undefinedColor = "#666";
var undefinedResult = "timed out";
//*** scale
var xTimeSummaryScale;
var xLinearSummaryScale;


var TsnePlotopt  = {
    margin: {top: 0, right: 0, bottom: 0, left: 0},
    offset: {top: top_margin},
    width: width,
    height: height-top_margin,
    scalezoom: 1,
    widthView: function(){return this.width*this.scalezoom},
    heightView: function(){return this.height*this.scalezoom},
    widthG: function(){return this.widthView()-this.margin.left-this.margin.right},
    heightG: function(){return this.heightView()-this.margin.top-this.margin.bottom},
    dotRadius: 30,
    opt:{
        epsilon : 10, // epsilon is learning rate (10 = default)
        perplexity : 30, // roughly how many neighbors each point influences (30 = default)
        dim : 2, // dimensionality of the embedding (2 = default)
        maxtries: 50
    }};
var Scatterplot = d3.Scatterplot();
var Radarplot = d3.radar();
var TSneplot = d3.Tsneplot().graphicopt(TsnePlotopt);

function setColorsAndThresholds(s) {
    for (var i=0; i<serviceList.length;i++){
        if (s == serviceList[i] && i==1){  // CPU_load
            dif = (thresholds[i][1]-thresholds[i][0])/4;
            mid = thresholds[i][0]+(thresholds[i][1]-thresholds[i][0])/2;
            left=0;
            arrThresholds = [left,thresholds[i][0], 0, thresholds[i][0]+2*dif, 10, thresholds[i][1], thresholds[i][1]];
            color = d3.scaleLinear()
                .domain(arrThresholds)
                .range(arrColor)
                .interpolate(d3.interpolateHcl); //interpolateHsl interpolateHcl interpolateRgb
            opa = d3.scaleLinear()
                .domain([left,thresholds[i][0],thresholds[i][0]+dif, thresholds[i][0]+2*dif, thresholds[i][0]+3*dif, thresholds[i][1], thresholds[i][1]+dif])
                .range([1,1,0.3,0.06,0.3,1,1]);

        }
        else if (s == serviceList[i] && i==2){  // Memory_usage
            dif = (thresholds[i][1]-thresholds[i][0])/4;
            mid = thresholds[i][0]+(thresholds[i][1]-thresholds[i][0])/2;
            left=0;
            arrThresholds = [left,thresholds[i][0], 0, thresholds[i][0]+2*dif, 98, thresholds[i][1], thresholds[i][1]];
            color = d3.scaleLinear()
                .domain(arrThresholds)
                .range(arrColor)
                .interpolate(d3.interpolateHcl); //interpolateHsl interpolateHcl interpolateRgb
            opa = d3.scaleLinear()
                .domain([left,thresholds[i][0],thresholds[i][0]+dif, thresholds[i][0]+2*dif, thresholds[i][0]+3*dif, thresholds[i][1], thresholds[i][1]+dif])
                .range([1,1,0.3,0.06,0.3,1,1]);

        }
        else if (s == serviceList[i]){
            dif = (thresholds[i][1]-thresholds[i][0])/4;
            mid = thresholds[i][0]+(thresholds[i][1]-thresholds[i][0])/2;
            left = thresholds[i][0]-dif;
            if (left<0 && i!=0) // Temperature can be less than 0
                left=0;
            arrThresholds = [left,thresholds[i][0], thresholds[i][0]+dif, thresholds[i][0]+2*dif, thresholds[i][0]+3*dif, thresholds[i][1], thresholds[i][1]+dif];
            color = d3.scaleLinear()
                .domain(arrThresholds)
                .range(arrColor)
                .interpolate(d3.interpolateHcl); //interpolateHsl interpolateHcl interpolateRgb
            opa = d3.scaleLinear()
                .domain([left,thresholds[i][0],thresholds[i][0]+dif, thresholds[i][0]+2*dif, thresholds[i][0]+3*dif, thresholds[i][1], thresholds[i][1]+dif])
                .range([1,1,0.3,0.06,0.3,1,1]);
        }
    }
}
//***********************


function initDetailView() {
    if (svg.select('.detailView').empty())
        svgStore.detailView = svg.append('g').attr('class', 'detailView');
    if (svg.select('.rackRect').empty()) {
        // Draw racks **********************
        for (var i = 0; i < racks.length; i++) {
            racks[i].x = 35 + racks[i].id * (w_rack + w_gap+4) - w_rack + 10;
            racks[i].y = top_margin;
        }
        // add main rack and sub rack

        //subrack below
        racksnewor = [];
        racks.forEach(d => {
            var newl = {};
            newl.id = d.id;
            newl.pos = 0;
            newl.x = d.x;
            newl.y = d.y;
            newl.hosts = d.hosts;
            racksnewor.push(newl);


        });

        svgStore.detailView.selectAll(".rackRect")
            .data(racks)
            .enter().append("rect")
            .attr("class", "rackRect")
            .attr("x", function (d, i) {
                return d.x - 6;
            })
            .attr("y", function (d) {
                return d.y;
            })
            .attr("rx", 10)
            .attr("ry", 10)
            .attr("width", (d, i) => (w_rack - 4))
            .attr("height", h_rack)
            .attr("fill", "#fff")
            .attr("stroke", "#000")
            .attr("stroke-width", 1)
            .style("box-shadow", "10px 10px 10px #666");
        svgStore.detailView.selectAll(".rackRectText1")
            .data(racks)
            .enter().append("text")
            .attr("class", "rackRectText1")
            .attr("x", function (d) {
                return d.x + w_rack/2 - 20;
            })
            .attr("y", function (d) {
                return d.y - 6;
            })
            .attr("fill", "currentColor")
            .style("text-anchor", "middle")
            .style("font-size", 16)
            .style("text-shadow", "1px 1px 0 rgba(255, 255, 255")
            .attr("font-family", "sans-serif")
            .text(function (d) {
                return "Rack " + d.id;
                //return "Rack " + d.id + ":   " + d.hosts.length + " hosts";
            });

        // Draw host names **********************
        /*svg.append("text")
            .attr("class", "hostText")
            .attr("x", 0)
            .attr("y", top_margin-15)
            .attr("fill", "#000")
            .style("font-weight","bold")
            .style("text-anchor", "start")
            .style("font-size", "12px")
            .style("text-shadow", "1px 1px 0 rgba(255, 255, 255")
            .attr("font-family", "sans-serif")
            .text("Summary");*/

        for (var i = 1; i <= maxHostinRack; i++) {
            var yy = getHostY(1, i);
            svgStore.detailView.append("text")
                .attr("class", "hostText")
                .attr("x", 32)
                .attr("y", yy + 1)
                .attr("fill", "currentColor")
                .style("text-anchor", "end")
                .style("font-size", "12px")
                .style("text-shadow", "1px 1px 0 rgba(255, 255, 255")
                .attr("font-family", "sans-serif")
                .text("Host");
        }
        for (var i = 0; i < hosts.length; i++) {
            var name = hosts[i].name;
            var hpcc_rack = +name.split("-")[1];
            var hpcc_node = +name.split("-")[2].split(".")[0];
            var xStart = racksnewor[hpcc_rack - 1].x - 2;
            var yy = getHostY(hpcc_rack, hpcc_node);
            // set opacity for current measurement text
            hosts[i].mOpacity = 0.1;


            svgStore.detailView.append("text")
                .attr("class", "hostId")
                .attr("x", xStart)
                .attr("y", yy + 1)
                .attr("fill", "#000")
                .style("text-anchor", "start")
                .style("font-size", "12px")
                .style("text-shadow", "1px 1px 0 rgba(255, 255, 255")
                .attr("font-family", "sans-serif")
                .text("" + hpcc_node);

            // svgStore.detailView.append("text")
            //     .attr("class", "measure_" + hosts[i].name)
            //     .attr("x", xStart  - 20)
            //     .attr("y", yy - 4)
            //     .attr("fill", "#000")
            //     .attr("fill-opacity", hosts[i].mOpacity)
            //     .style("text-anchor", "end")
            //     .style("font-size", "11px")
            //     .style("text-shadow", "1px 1px 0 rgba(0, 0, 0")
            //     .attr("font-family", "sans-serif")
            //     .text("");
        }
    }
    TSneplot.remove();
}

function main() {

    for (var att in hostList.data.hostlist) {
        var h = {};
        h.name = att;
        h.hpcc_rack = +att.split("-")[1];
        h.hpcc_node = +att.split("-")[2].split(".")[0];
        h.index = hosts.length;

        // to contain the historical query results
        hostResults[h.name] = {};
        hostResults[h.name].index = h.index;
        hostResults[h.name].arr = [];
        hostResults[h.name].arrTemperature = [];
        hostResults[h.name].arrCPU_load = [];
        hostResults[h.name].arrMemory_usage = [];
        hostResults[h.name].arrFans_health= [];
        hostResults[h.name].arrPower_usage= [];
        hosts.push(h);
        // console.log(att+" "+h.hpcc_rack+" "+h.hpcc_node);

        // Compute RACK list
        var rackIndex = isContainRack(racks, h.hpcc_rack);
        if (rackIndex >= 0) {  // found the user in the users list
            racks[rackIndex].hosts.push(h);
        }
        else {
            var obj = {};
            obj.id = h.hpcc_rack;
            obj.hosts = [];
            obj.hosts.push(h);
            racks.push(obj);
        }
        // Sort RACK list
        racks = racks.sort(function (a, b) {
            if (a.id > b.id) {
                return 1;
            }
            else return -1;
        })
    }
    for (var i = 0; i < racks.length; i++) {
        racks[i].hosts.sort(function (a, b) {
            if (a.hpcc_node > b.hpcc_node) {
                return 1;
            }
            else return -1;
        })

    }


    hosts.sort((a,b)=>{

        var rackx = a.hpcc_rack;
        var racky = b.hpcc_rack;
        var x = a.hpcc_node;
        var y = b.hpcc_node;
        if (rackx !== racky){
            return rackx-racky;
        }else {

                return x - y

        }
    });
    radarChartsumopt.scaleDensity= d3.scaleLinear().domain([1,hosts.length]).range([0.3, 0.75]);
    // hosts.sort(function (a, b) {
    //     if (a.hpcc_rack*1000+a.hpcc_node > b.hpcc_rack*1000+b.hpcc_node) {
    //         return 1;
    //     }
    //     else return -1;
    // })

    // Summary Panel ********************************************************************
    var maingradient = svg.append("defs").append("linearGradient")
        .attr("id","mainColor")
        .attr('x1','0%')
        .attr('y1','100%')
        .attr('x2','0%')
        .attr('y2','0%');
    maingradient.selectAll('stop').data(arrColor)
        .enter().append('stop')
        .attr('offset',(d,i)=> (i-1)/4 )
        .style('stop-color',d=>d)
        .style('stop-opacity',(d,i)=>opa.range()[i]);
    svgsum = svg.append("g")
        .attr("class", "summaryGroup")
        .attr("transform","translate(" + 1 + "," + 15 + ")");
    svgsum.append("rect")
        .attr("class", "summaryRect")
        .attr("rx", 10)
        .attr("ry", 10)
        .attr("width", width-2)
        .attr("height", sHeight)
        .attr("fill", "#fff")
        .attr("stroke", "#000")
        .attr("stroke-width", 1)
        .style("box-shadow", "10px 10px 10px #666");
    svgsum.append('svg')
        .attr("class","summarySvg")
        .attr("width", width-2)
        .attr("height", sHeight);
    d3.select(".summaryText1")
        .html("Quanah HPC system: <b>" + hosts.length+"</b> hosts distributed in 10 racks" );


    var currentTextGroup = svg.append('g')
        .attr("class", "currentTextGroup")
        .attr('transform', 'translate(' + 10 + ',' + (sHeight-36) + ')');
    svgsum.append("line")
        .attr("class", "currentTimeline")
        .attr("x1", 10)
        .attr("y1", 0)
        .attr("x2", 10)
        .attr("y2", sHeight)
        .attr("stroke", "#000")
        .attr("stroke-width", 1)
        .style("stroke-dasharray", ("2, 2"));
    currentTextGroup.append("text")
        .attr("class", "currentText")
        .attr("y", 0)
        .attr("fill", "#000")
        .style("text-anchor", "start")
        .style("font-size", "12px")
        .style("text-shadow", "1px 1px 0 rgba(255, 255, 255")
        .attr("font-family", "sans-serif")
        .text("Latest REQUEST");
    currentTextGroup.append("text")
        .attr("class", "currentHostText")
        .attr("y", 18)
        .attr("fill", "#000")
        .style("text-anchor", "start")
        .style("font-weight","bold")
        .style("font-size", "12px")
        .style("text-shadow", "1px 1px 0 rgba(255, 255, 255")
        .attr("font-family", "sans-serif")
        .text("Host");
    currentTextGroup.append("text")
        .attr("class", "currentTimeText")
        .attr("y", 36)
        .attr("fill", "#000")
        .style("text-anchor", "start")
        .style("font-style","italic")
        .style("font-size", "12px")
        .style("text-shadow", "1px 1px 0 rgba(255, 255, 255")
        .attr("font-family", "sans-serif")
        .text("Time");




    initDetailView();
    svgStore.tsnesvg =svg.append('g').attr("class", "largePanel").attr('transform',`translate(0,${top_margin})`)
        .append("svg").attr("class", "T_sneSvg");

    // Draw line to connect current host and timeline in the Summary panel
    let linepointer = svg.append("line")
        .attr("class", "connectTimeline")
        .attr("x1", 10)
        .attr("y1", sHeight+15)
        .attr("x2", 10)
        .attr("y2", 310)
        .attr("stroke", "#000")
        .attr("stroke-width", 1)
        .style("stroke-dasharray", ("2, 2"));
    // ********* REQUEST ******************************************
    xLinearSummaryScale = d3.scaleAdjust().range([0-radarsize/24,width+radarsize/24]).domain([0, maxstack-1]).itemsize(radarsize);
    //xLinearSummaryScale = d3.scaleAdjust().range([0,width]).domain([0, maxstack-1]).itemsize(radarsize);
    xTimeSummaryScale =xLinearSummaryScale;
    Radarplot.svg(svgsum.select(".summarySvg")).BinRange([4,10]).scale(xLinearSummaryScale)
        .maxstack(maxstack);
    TSneplot.svg(svgStore.tsnesvg).linepointer(linepointer).init();
    request();
}
var currentlastIndex;
var speedup= false;
function request(){
    bin.data([]);
    var count = 0;
    var countbuffer = 0;
    var iteration = 0;
    var haveMiddle = false;
    currentMiliseconds = new Date().getTime();  // For simulation
    query_time=currentMiliseconds;
    lastIndex = 0;
    var countarr = [];
    var requeststatus =true;
    interval2 = new IntervalTimer(function (simDuration) {
        var midlehandle = function (ri){
            let returniteration = ri[0];
            let returnCount = ri[1];
            countarr.push(returnCount);
            count += 1;
        };
        var drawprocess = function ()  {

            drawsummarypoint(countarr);
            countarr.length = 0;
            // fullset draw
            if (count >= (hosts.length)) {// Draw the summary Box plot ***********************************************************
                // Draw date
                d3.select(".currentDate")
                    .text("" + new Date(currentMiliseconds).toDateString());

                // cal to plot
                bin.data([]);
                drawsummary();
                shiftTimeText();
                count = 0;
                countbuffer = 0;
                requeststatus = true;
                haveMiddle = false;
                iteration += iterationstep;
            }
            Scatterplot.init(xTimeSummaryScale(0) + swidth / 2);
            xTimeSummaryScaleStep = d3.scaleLinear()
                .domain([0, hosts.length - 1]) // input
                .range([0, xTimeSummaryScale.step()]);
            Date.prototype.timeNow = function () {
                return ((this.getHours() < 10) ? "0" : "") + this.getHours() + ":" + ((this.getMinutes() < 10) ? "0" : "") + this.getMinutes();
            };
            Date.prototype.timeNow2 = function () {
                return ((this.getHours() < 10) ? "0" : "") + this.getHours() + ":" + ((this.getMinutes() < 10) ? "0" : "") + this.getMinutes() + ":" + ((this.getSeconds() < 10) ? "0" : "") + this.getSeconds();
            };


            var rescaleTime = d3.scaleLinear().range([0, radarsize]).domain(xTimeSummaryScaleStep.domain());
            // Update the current timeline in Summary panel
            var x2 = xTimeSummaryScale(lastIndex < maxstack ? lastIndex : (maxstack - 1))
                + ((lastIndex < (maxstack - 1)) ? xTimeSummaryScaleStep(count===0? hosts.length:count) : rescaleTime(xTimeSummaryScaleStep(count)));

            // mark time
            // console.log(count);
            // console.log((count > hosts.length/2 && !haveMiddle));
            if (( (count > hosts.length/2) && !haveMiddle))
            {
                updateTimeText(count);
                haveMiddle = true;
            }
            svg.selectAll(".currentTimeline")
                .attr("x1", x2)
                .attr("x2", x2);

            svg.selectAll(".connectTimeline")
                .attr("x1", x2)
            if (charType!=="T-sne Chart")
                svg.selectAll(".connectTimeline")
                    .attr("x2", currentHostX)
                    .attr("y2", currentHostY);

            svg.selectAll(".currentTextGroup")
                .attr('transform', 'translate(' + (x2 + 2) + ',' + (sHeight - 36) + ')');
            svg.selectAll(".currentText")
                .text("Latest update:");
            svg.selectAll(".currentTimeText")
                .text(new Date(query_time).timeNow2());
            svg.selectAll(".currentHostText")
                .text(currentHostname);

            // Update measurement text and opacity
            for (var i = 0; i < hosts.length; i++) {
                if (hosts[i].name == currentHostname) {
                    hosts[i].mOpacity = 1;
                    hosts[i].xOpacity = currentHostX + 38;

                    if (hosts[i].xOpacity>racks[hosts[i].hpcc_rack - 1].x+w_rack-20)
                        hosts[i].mOpacity = 0;

                    var mea = currentMeasure;
                    if (selectedService == "Job_load" || selectedService == "Memory_usage") {
                        mea = currentMeasure.toFixed(2);
                    }
                    else if (selectedService == "Power_consumption") {
                        mea = Math.round(currentMeasure);
                    }
                    // svg.selectAll(".measure_" + hosts[i].name)
                    //     .attr("fill", color(currentMeasure))
                    //     .text(mea);
                }
                else {
                    if (hosts[i].mOpacity > 0)
                        hosts[i].mOpacity -= 0.01;
                    if (hosts[i].xOpacity == undefined)
                        hosts[i].xOpacity = currentHostX + 38;
                }


                // svg.selectAll(".measure_" + hosts[i].name)
                //     .attr("fill-opacity", hosts[i].mOpacity)
                //     .attr("x", hosts[i].xOpacity - 10);

            }
        };
        if (requeststatus) {
            var oldrack = hosts[countbuffer].hpcc_rack;
            if (isRealtime) {
                step(iteration, countbuffer).then((ri) => {
                    midlehandle(ri);
                    drawprocess();
                });
                countbuffer++;
            }
            else
            {
                do {
                    let ri = step(iteration, countbuffer);
                    midlehandle(ri);
                    countbuffer++;
                }while ((countbuffer < hosts.length)&& speedup);
                speedup = false;
                drawprocess();
            }
            if (countbuffer>= (hosts.length))
                requeststatus = false; //stop request

        }
    } , simDuration);

    var count3=0;

    var interval3 = setInterval(function(){
        svg.selectAll(".currentText")
            .attr("fill", decimalColorToHTMLcolor(count3*7));
        count3++;
        if (count3>10000)
            count3 = 10000;
    } , 20);
}

function scaleThreshold(i){
    return i<maxstack?i:(maxstack-2);
}

function drawsummary(initIndex){
    var arr = [];
    var xx;

    if (initIndex===undefined){
        currentlastIndex = hostResults[hosts[0].name].arr.length -1;
        lastIndex = currentlastIndex;
        query_time = hostResults[hosts[hosts.length-1].name].arr[lastIndex].result.query_time;
        xx = xTimeSummaryScale(scaleThreshold(lastIndex));
        // updateTimeText(); //time in end
    }else{
        lastIndex = initIndex;
        query_time = hostResults[hosts[hosts.length-1].name].arr[lastIndex].result.query_time;
        var temp = (maxstack-2)-(currentlastIndex-initIndex);
        if (currentlastIndex > maxstack-2)
            xx = xTimeSummaryScale(temp);
        else {
            temp = lastIndex;
            xx = xTimeSummaryScale(lastIndex);
        }

    }
    switch (sumType) {
        case "Boxplot":
            for(var h = 0;h < hosts.length;h++)
            {
                var name = hosts[h].name;
                var r = hostResults[name];
                // lastIndex = initIndex||(r.arr.length - 1);
                // boxplot
                if (lastIndex >= 0) {   // has some data
                    var a = processData(r.arr[lastIndex].data.service.plugin_output, selectedService);
                    arr.push(a[0]);
                }
            }
            drawBoxplot(svg, arr, temp===undefined?(lastIndex>(maxstack-1)?(maxstack-1):lastIndex):temp, xx + xTimeSummaryScale.step()-ww);
            break;
        case "Scatterplot":


            Scatterplot.svg(svg).data(hostResults).draw(lastIndex,temp===undefined?(lastIndex>(maxstack-1)?(maxstack-1):lastIndex):temp,xx+80);

            break;
        case "Radar":
            // for(var h = 0;h < hosts.length;h++)
            // {
            //     var name = hosts[h].name;
            //     var r = hostResults[name];
            //     // lastIndex = initIndex||(r.arr.length - 1);
            //     // boxplot
            //     if (lastIndex >= 0) {   // has some data
            //         var arrServices = [];
            //         serviceList.forEach((ser,indx) => {
            //             var obj = {};
            //             var a = processData(r[serviceListattr[indx]][lastIndex].data.service.plugin_output, ser);
            //             obj.a = a;
            //             arrServices.push(obj);})
            //     }
            //     arrServices.name = name;
            //     arr.push(arrServices);
            // }
            // Radarplot.data(arr).draw(temp===undefined?lastIndex:temp);
            // Radar Time
            //drawRadarsum(svg, arr, lastIndex, xx-radarsize);
            break;

    }
    lastIndex = currentlastIndex;
}
function drawsummarypoint(harr){
    var arr = [];
    var xx;
    lastIndex = hostResults[hosts[harr[0]].name].arrTemperature.length -1;
    query_time = hostResults[hosts[harr[0]].name].arrTemperature[lastIndex].result.query_time;
    
    //xx = xTimeSummaryScale(query_time);
    //updateTimeText();

    switch (sumType) {
        case "Boxplot":
            break;
        case "Scatterplot":
            break;
        case "Radar":
            // for (var i in harr) {
            //     var h  = harr[i];
            //     var name = hosts[h].name;
            //     var r = hostResults[name];
            //     // lastIndex = initIndex||(r.arr.length - 1);
            //     // boxplot
            //     if (lastIndex >= 0) {   // has some data
            //         var arrServices = [];
            //         serviceList_selected.forEach((ser, indx) => {
            //             try {
            //                 var obj = {};
            //                 let dataextract = r[serviceListattr[indx]][lastIndex];
            //                 if (dataextract)
            //                     dataextract = dataextract.data.service.plugin_output;
            //                 var a = processData(dataextract, ser);
            //                 obj.a = a;
            //                 arrServices.push(obj);
            //             }catch(e){}
            //         })
            //     }
            //     arrServices.name = name;
            //     arr.push(arrServices);
            // }
            // Radarplot.data(arr).drawpoint(lastIndex);
            // Radar Time
            //drawRadarsum(svg, arr, lastIndex, xx-radarsize);
            break;

    }
}
function shiftTimeText(){
    if (timelog.length > maxstack-1){ timelog.shift();
    svg.selectAll(".boxTime").filter((d,i)=>i).transition().duration(500)
        .attr("x", (d,i)=>xTimeSummaryScale(i)+ width/maxstack/2);
    svg.select(".boxTime").transition().duration(500)
        .attr("x", xTimeSummaryScale(0)+ width/maxstack/2)
        .transition().remove();
    }
}
function updateTimeText(index){
    if (index!= undefined)timelog.push (hostResults[hosts[(index||hosts.length)-1].name].arr.map(d=>d.result.query_time)[lastIndex]);
    if (timelog.length>maxstack) timelog.shift();
    var boxtime = svg.selectAll(".boxTime")
        .data(timelog);
    boxtime.transition().duration(500)
        .attr("x", (d,i)=>xTimeSummaryScale(i)+ width/maxstack/2)
        .text(d=> {
            let temp = new Date(d);
            return temp.getHours()+":"+temp.getMinutes();
        });
    boxtime.exit().remove();
    boxtime.enter().append("text")
        .attr("class", "boxTime")
        .attr("x", (d,i)=>xTimeSummaryScale(i)+ width/maxstack/2)
        .attr("y", sHeight)
        .attr("fill", "#000")
        .style("font-style","italic")
        .style("text-anchor","end")
        .style("font-size", "12px")
        .style("text-shadow", "1px 1px 0 rgba(255, 255, 255")
        .attr("font-family", "sans-serif")
        .text(new Date(query_time).timeNow());
}
// Delete unnecessary files
function processResult(r){
    var obj = {};
    obj.result = {};
    obj.result.query_time = r.result.query_time;
    obj.data = {};
    obj.data.service={};
    obj.data.service.host_name = r.data.service.host_name;
    obj.data.service.plugin_output = r.data.service.plugin_output
    return obj;
}

function predict (arr,ser){
    try{
        return processData(arr[arr.length-1].data.service.plugin_output,ser);
    } catch(e){
        switch (ser){
            case serviceList[3]:
                return [0,0,0,0];
            default:
                return [0,0,0];
        }
    }
}

// function processData(str, serviceName) {
//     if (serviceName == serviceList[0]){
//         var a = [];
//         if (str.indexOf("timed out")>=0 || str.indexOf("(No output on stdout)")>=0 || str.indexOf("UNKNOWN")>=0 ){
//             a[0] = undefinedValue;
//             a[1] = undefinedValue;
//             a[2] = undefinedValue;
//         }
//         else{
//             var arrString =  str.split(" ");
//             a[0] = +arrString[2]||undefinedValue;
//             a[1] = +arrString[6]||undefinedValue;
//             a[2] = +arrString[10]||undefinedValue;
//         }
//         return a;
//     }
//     else if (serviceName == serviceList[1]){
//         var a = [];
//         if (str.indexOf("timed out")>=0 || str.indexOf("(No output on stdout)")>=0 || str.indexOf("UNKNOWN")>=0
//             || str.indexOf("CPU Load: null")>=0){
//             a[0] = undefinedValue;
//             a[1] = undefinedValue;
//             a[2] = undefinedValue;
//         }
//         else{
//             var arrString =  str.split("CPU Load: ")[1];
//             a[0] = +arrString;
//             a[1] = undefinedValue;
//             a[2] = undefinedValue;
//         }
//         return a;
//     }
//     else if (serviceName == serviceList[2]) {
//         var a = [];
//         if (str.indexOf("timed out")>=0 || str.indexOf("(No output on stdout)")>=0 || str.indexOf("UNKNOWN")>=0 ){
//             a[0] = undefinedValue;
//             a[1] = undefinedValue;
//             a[2] = undefinedValue;
//         }
//         else{
//             var arrString =  str.split(" Usage Percentage = ")[1].split(" :: ")[0];
//             a[0] = +arrString;
//             a[1] = undefinedValue;
//             a[2] = undefinedValue;
//         }
//         return a;
//     }
//     else if (serviceName == serviceList[3]) {
//         var a = [];
//         if (str.indexOf("timed out")>=0 || str.indexOf("(No output on stdout)")>=0 || str.indexOf("UNKNOWN")>=0 ){
//             a[0] = undefinedValue;
//             a[1] = undefinedValue;
//             a[2] = undefinedValue;
//             a[3] = undefinedValue;
//         }
//         else{
//             var arr4 =  str.split(" RPM ");
//             a[0] = +arr4[0].split("FAN_1 ")[1];
//             a[1] = +arr4[1].split("FAN_2 ")[1];
//             a[2] = +arr4[2].split("FAN_3 ")[1];
//             a[3] = +arr4[3].split("FAN_4 ")[1];
//         }
//         return a;
//     }
//     else if (serviceName == serviceList[4]) {
//         var a = [];
//         if (str.indexOf("timed out")>=0 || str.indexOf("(No output on stdout)")>=0 || str.indexOf("UNKNOWN")>=0 ){
//             a[0] = undefinedValue;
//             a[1] = undefinedValue;
//             a[2] = undefinedValue;
//         }
//         else{
//             var maxConsumtion = 3.2;  // over 100%
//             var arr4 =  str.split(" ");
//             a[0] = +arr4[arr4.length-2]/maxConsumtion;
//             a[1] = undefinedValue;
//             a[2] = undefinedValue;
//         }
//         return a;
//     }
// }
processData = processData_influxdb;
var serviceQuery ={
    nagios_old: ["temperature","cpu+load" ,"memory+usage" ,"fans+health" ,"power+usage"],
    nagios: {
        "Temperature":{
            format: (d)=> `CPU${d} Temp`,
            "numberOfEntries":2,
            "type":"json",
            "query":"CPU_Temperature"
        },
        "Job_load":{
            format: ()=> "cpuusage",
            "numberOfEntries":1,
            "type":"json",
            "query":"CPU_Usage"
        },
        "Memory_usage":{
            "format":()=>"memoryusage",
            "numberOfEntries":1,
            "type":"json",
            "query":"Memory_Usage",
            "rescale": 1/191.908,
        },
        "Fans_speed":{
            format: (d)=> `FAN_${d}`,
            "numberOfEntries":4,
            "type":"json",
            "query":"Fan_Speed"
        },
        "Power_consum":{
            "format": ()=>"powerusage_watts",
            "numberOfEntries":1,
            "type":"json",
            "query":"Node_Power_Usage",
            "rescale": 1/3.2,
        }
    },
    influxdb: {
        "Temperature":{
            "CPU_Temperature" : {
                format: (d) => `CPU${d} Temp`,
                "numberOfEntries": 2,
            },
            "Inlet_Temperature" : {
                format: () => `Inlet Temp`,
                "numberOfEntries": 1,
            }
        },
        "Job_load":{
            "CPU_Usage": {
                format: () => "cpuusage",
                "numberOfEntries": 1,
            }
        },
        "Memory_usage":{
            "Memory_Usage": {
                format: () => "memoryusage",
                "numberOfEntries": 1,
                "rescale": 100 / 191.908,
            }
        },
        "Fans_speed":{
            "Fan_Speed" : {
                format: (d) => `FAN_${d}`,
                "numberOfEntries": 4,
            }
        },
        "Power_consum":{
            "Node_Power_Usage" : {
                "format": () => "powerusage_watts",
                "numberOfEntries": 1,
                "rescale": 1 / 3.2,
            }
        },
        "Job_scheduling":{
            "Job_Info" : {
                "format": () => "job_data",
                "numberOfEntries": 1,
                "type": 'object',
            }
        }
    },
};
db = 'influxdb'
function processData_influxdb(result, serviceName) {
    const serviceAttribute = serviceQuery[db][serviceName];
    const query_return = d3.keys(serviceAttribute);
    if (result) {
        let val = result.results;
        return d3.merge(query_return.map((s, i) => {
            if (val[i].series) // no error
            {
                const subob = _.object(val[i].series[0].columns, val[i].series[0].values[0]);
                if (subob.error === "None" || subob.error === null || serviceAttribute[s].type==='object')
                    return d3.range(serviceAttribute[s].numberOfEntries).map(d => {
                        const localVal = subob[serviceAttribute[s].format(d + 1)];
                        if (localVal != null) {
                            if (serviceAttribute[s].type==='object')
                                return string2JSON(localVal);
                            return localVal * (serviceAttribute[s].rescale || 1);
                        }
                        else return undefined;
                    });
                else
                    return d3.range(serviceAttribute[s].numberOfEntries).map(d => undefined);
            } else {
                return d3.range(serviceAttribute[s].numberOfEntries).map(d => undefined);
            }
        }));
    }
    return d3.merge(query_return.map((s, i) => {
        return d3.range(serviceAttribute[s].numberOfEntries).map(d => undefined);
    }));
}
function string2JSON (str){
    try {
        return JSON.parse("["+str.replace(/'/g,'"').replace(/;/g,',')+"]")
    }catch(e){
        return undefined;
    }
}
function decimalColorToHTMLcolor(number) {
    //converts to a integer
    var intnumber = number - 0;

    // isolate the colors - really not necessary
    var red, green, blue;

    // needed since toString does not zero fill on left
    var template = "#000000";

    // in the MS Windows world RGB colors
    // are 0xBBGGRR because of the way Intel chips store bytes
    red = (intnumber&0x0000ff) << 16;
    green = intnumber&0x00ff00;
    blue = (intnumber&0xff0000) >>> 16;

    // mask out each color and reverse the order
    intnumber = red|green|blue;

    // toString converts a number to a hexstring
    var HTMLcolor = intnumber.toString(16);

    //template adds # for standard HTML #RRGGBB
    HTMLcolor = template.substring(0,7 - HTMLcolor.length) + HTMLcolor;

    return HTMLcolor;
}

function simulateResults2(hostname,iter, s){
    var newService;
    let serviceIndex =  serviceList.findIndex(d=>d===s);
    newService = (sampleS[hostname][serviceListattr[serviceIndex]]||[])[iter];
    if (serviceIndex === 4) {
        if (sampleS[hostname]["arrPower_usage"]=== undefined && db!=="influxdb") {
            var simisval = handlemissingdata(hostname,iter);
            sampleS[hostname]["arrPower_usage"] = [simisval];
        }else if (sampleS[hostname]["arrPower_usage"][iter]=== undefined  && db!=="influxdb"){
            var simisval = handlemissingdata(hostname,iter);
            sampleS[hostname]["arrPower_usage"][iter] = simisval;
        }
        newService = sampleS[hostname]["arrPower_usage"][iter];
    }
    if (newService === undefined){
        newService ={};
        newService.result = {};
        newService.result.query_time = query_time;
        newService.data = {};
        newService.data.service={};
        newService.data.service.host_name = hostname;
        newService.data.service.plugin_output = undefined;
    }else {
        if (db === "influxdb")
            try {
                newService.result.query_time = d3.timeParse("%Y-%m-%dT%H:%M:%S.%LZ")(newService.result.query_time).getTime();
            }catch(e){

            }
    }
    return newService;
}

function handlemissingdata(hostname,iter){
    var simisval = jQuery.extend(true, {}, sampleS[hostname]["arrTemperature"][iter]);
    var simval = processData(simisval.data.service.plugin_output, serviceList[0]);
    // simval = (simval[0]+simval[1])/2;
    simval = (simval[0]+simval[1]+20);
    var tempscale = d3.scaleLinear().domain([thresholds[0][0],thresholds[0][1]]).range([thresholds[4][0],thresholds[4][1]]);
    if (simval!==undefinedValue && !isNaN(simval) )
        //simisval.data.service.plugin_output = "OK - The average power consumed in the last one minute = "+Math.round(tempscale(simval)*3.2)+" W";
        simisval.data.service.plugin_output = "OK - The average power consumed in the last one minute = "+Math.floor(simval*3.2)+" W";
    else
        simisval.data.service.plugin_output = "UNKNOWN";
    return simisval;
}
function gaussianRand() {
    var rand = 0;
    for (var i = 0; i < 6; i += 1) {
        rand += Math.random();
    }
    return rand / 6;
}

function gaussianRandom(start, end) {
    return Math.floor(start + gaussianRand() * (end - start + 1));
}
var scalewidthnode = 1;
var hostfirst;
function plotResult(result) {
    // Check if we should reset the starting point
    if (firstTime) {
        currentMiliseconds = result.result.query_time;
        hostfirst = result.data.service.host_name;
        xTimeScale = d3.scaleLinear()
            .domain([0, maxstack-1]);
    }
    firstTime = false;
    var name =  result.data.service.host_name;

    query_time = result.result.query_time;  // for drawing current timeline in Summary panel
    currentHostname = name;

    // Process the array data ***************************************
    var r = hostResults[name];
    var hpcc_rack = +name.split("-")[1];
    var hpcc_node = +name.split("-")[2].split(".")[0];
    var xStart = racksnewor[(hpcc_rack - 1)].x+15;
    // var xStart = racks[hpcc_rack - 1].x+15;
    xTimeScale.range([xStart, xStart+Math.min(w_rack-node_size*scalewidthnode,node_size*maxstack*scalewidthnode)]); // output
        // .range([xStart, xStart+w_rack/2-2*node_size]); // output
    var y = getHostY(hpcc_rack,hpcc_node);


    // Process the array of historical temperatures ***************************************
    var arr = [];
    var startinde = 0;
    // while(maxstackminute)
    if ((r.arr.length>maxstack)||(r.arr.length==maxstack)){
        startinde = (r.arr.length-maxstack);

            //var deltaMiliseconds = r.arr[startinde].result.query_time - currentMiliseconds;
            //var deltapos =xTimeScale(r.arr[startinde].result.query_time)-xTimeScale(currentMiliseconds);
            //xTimeScale.range([xStart-deltapos, xStart+w_rack/2-2*node_size-deltapos]); // output
            // xTimeScale.domain([r.arr[startinde].result.query_time, currentMiliseconds + numberOfMinutes * maxHostinRack * 1000 - deltaMiliseconds]);

    }

    for (var i=startinde; i<r.arr.length;i++){
        var a = processData(r.arr[i].data.service.plugin_output, selectedService);
        var obj = {};
        obj.temp1 = a[0];
        obj.temp2 = a[1];
        obj.temp3 = a[2];
        obj.query_time =r.arr[i].result.query_time;
        obj.x = xTimeScale(i-startinde);
        arr.push(obj);
        currentHostX = obj.x ;
        currentMeasure = obj.temp1;
    }

    currentHostY = y;


    // get Time
    var minTime = 10*(new Date("1/1/2030").getTime());  // some max number
    var maxTime = 0;
    for (var i=0; i<r.arr.length;i++){
        var qtime =r.arr[i].result.query_time;
        minTime = Math.min(minTime,qtime);
        maxTime = Math.max(maxTime,qtime);
    }
    if (maxTime-minTime>0.8*numberOfMinutes*60*1000)  // Limit time to STOP***********************
        pauseRequest();

    switch (charType) {
        case "Heatmap":
            initDetailView();
            plotHeat(arr, name, hpcc_rack, hpcc_node, xStart, y);
            break;
        case "Area Chart":
            initDetailView();
            plotArea(arr, name, hpcc_rack, hpcc_node, xStart, y,startinde);
            break;
        case "T-sne Chart":
            initTsneView();
            if (!speedup) {
                plotTsne(name);
            }
    }


}
function initTsneView() {
    if (!svgStore.detailView.select('.rackRect').empty()) {
        svgStore.detailView.selectAll('*').remove();
        TSneplot.reset(true);
    }
}

function plotHeat(arr,name,hpcc_rack,hpcc_node,xStart,y,minTime,maxTime){
    svgStore.detailView.selectAll(".RackSummary").remove();
    svgStore.detailView.selectAll("."+name).remove();
    for (var i=0; i<arr.length;i++){
        var obj = arr[i];
        var xMin = xTimeScale(0);
        var xMax = xTimeScale(maxstack-1);
        var x = xTimeScale(i);
        // if (arr.length>1)
        //     x = xMin+ i*(xMax-xMin)/(arr.length);
        svgStore.detailView.append("rect")
            .attr("class", name)
            .attr("x", x)
            .attr("y", y-10)
            .attr("width", node_size*scalewidthnode)
            .attr("height", node_size )
            .attr("stroke", "#000")
            .attr("stroke-width", 0.05)
            .attr("fill", function (d) {
                if (obj.temp1==undefinedValue)
                    return undefinedColor;
                else
                    return color(obj.temp1);
            })
            .attr("fill-opacity",function (d) {
                return opa(obj.temp1);
            })
            .on("mouseover", function (d) {
                mouseoverNode (this);
            })
        ;//.on("mouseout", mouseoutNode);

        if (selectedService=="Temperature" || selectedService=="Fans_speed")    {
            svgStore.detailView.append("rect")
                .attr("class", name)
                .attr("x", x)
                .attr("y", y+node_size-9)
                .attr("width", node_size*scalewidthnode)
                .attr("height", node_size )
                .attr("fill", function (d) {
                    if (obj.temp2==undefinedValue)
                        return undefinedColor;
                    else
                        return color(obj.temp2);
                })
                .attr("fill-opacity",function (d) {
                    return opa(obj.temp2);
                })
                .attr("stroke", "#000")
                .attr("stroke-width", 0.05)
                .on("mouseover", function (d) {
                    mouseoverNode (this);
                })
            ;//.on("mouseout", mouseoutNode);
        }
    }
    // *****************************************
    /// drawSummaryAreaChart(hpcc_rack, xStart);
}

function plotArea(arr,name,hpcc_rack,hpcc_node,xStart,y,startinde){
    var yScale = d3.scaleLinear()
        .domain([(thresholds[0][1]-thresholds[0][0])/2,thresholds[0][1]]) //  baseTemperature=60
        .range([0, node_size*2]); // output

    var area = d3.area()
        .x(function(d) { return d.x; })
        .y0(function(d) { return y; })
        .y1(function(d) { return y-yScale(d.temp1); })
        .curve(d3.curveCatmullRom);

    svgStore.detailView.selectAll("."+name).remove();
    svgStore.detailView
        .append('clipPath').attr("class", name)
        .attr("id", "cp"+name).append("path")
        .datum(arr) // 10. Binds data to the line
        .attr("d", area);
    svgStore.detailView
        .append('rect')
        .attr("class", name)
        .attr('width',xTimeScale.range()[1]-xTimeScale.range()[0])
        .attr('height',yScale.range()[1]*2)
        .attr('x',arr[0].x)
        .attr('y',y-yScale.range()[1]).attr("fill","url(#mainColor)")
        .attr("clip-path","url(#cp"+name+")");

    svgStore.detailView.append("path")
        .datum(arr) // 10. Binds data to the line
        .attr("class", name)
        .attr("stroke","#000")
        .attr("stroke-width",0.2)
        .attr("d", area)
        .attr("fill-opacity",function (d) {
            return opa(d[d.length-1].temp1);
        })
        .on("mouseover", function (d) {
            mouseoverNode (this);
        })
    ;//.on("mouseout", mouseoutNode);
    // svgStore.detailView.selectAll("."+name).transition().duration(1000)
    //     .style("fill",function (d) {
    //         return color(d[d.length-1].temp1);
    //     })

    // drawSummaryAreaChart(hpcc_rack, xTimeScale(0),startinde);
}

function plotTsne(nameh){
    if (globalTrend)
        startIndex =0;
    else
        startIndex = lastIndex;
    let arr =[];
    for(var h = 0;h < hosts.length;h++)
    {
        var name = hosts[h].name;
        var r = hostResults[name];
        var arrServices = [];
        for (var stepIndex = startIndex; stepIndex<= lastIndex; stepIndex++) {
                serviceList.forEach((ser, indx) => {
                    var a
                    if (r[serviceListattr[indx]][stepIndex]) {
                        a = processData(r[serviceListattr[indx]][stepIndex].data.service.plugin_output, ser);
                    }else {
                        a = predict (r[serviceListattr[indx]],ser)
                    }
                    var scale = d3.scaleLinear()
                                    .domain([thresholds[indx][0],thresholds[indx][1]])
                                    .range([0,1]);
                    a = a.map(d=>scale(d)||0);
                    switch(indx){
                        case 0:
                        case 3:
                            arrServices = d3.merge([arrServices,a]);
                            break;
                        default:
                            arrServices.push(a[0]||0)
                    }
                })
        }
        arrServices.name = name;
        arr.push(arrServices);
    }
    TSneplot.data(arr).draw(nameh);
}
function drawSummaryAreaChart(rack, xStart, startIndex) {
    var arr2 = [];
    var binStep = 8; // pixels
    var maxX = 0;  // The latest x position, to draw the baseline 60 F
    for (var att in hostResults) {
        var hpcc_rack = +att.split("-")[1];
        var hpcc_node = +att.split("-")[2].split(".")[0];
        if (hpcc_rack == rack) {
            var r = hostResults[att];
            for (var i = startIndex; i < r.arr.length; i++) {
                var a = processData(r.arr[i].data.service.plugin_output, selectedService);
                var obj = {};
                obj.temp1 = a[0];
                obj.temp2 = a[1];
                obj.temp3 = a[2];
                obj.query_time = r.arr[i].result.query_time;
                obj.x = xTimeScale(i);
                if (obj.x >maxX)
                    maxX = obj.x ;  // The latest x position, to draw the baseline 60 F

                obj.bin = Math.round((obj.x-xStart)/binStep);   // How to compute BINS ******************************************
                if (arr2[obj.bin] == undefined)
                    arr2[obj.bin] = [];
                arr2[obj.bin].push(obj);
            }
        }
    }
    var arr3 = [];
    for (var att in arr2) {
        if (arr2[att].length>=2){
            var max = 0;
            var min = 1000;
            for (var j=startIndex; j< arr2[att].length; j++) {
                var temp1 = arr2[att][j].temp1;
                if (temp1 > max)
                    max = temp1;
                if (temp1 < min)
                    min = temp1;

            }
            var obj ={};
            obj.bin = arr2[att][0].bin;
            obj.min = min;
            obj.max = max;
            arr3.push(obj)
        }
    }


    // Drawing areas ****************************************************
    var y = top_margin-16;

    var yScale = d3.scaleLinear()
        .domain([baseTemperature, 120]) //  baseTemperature=60
        .range([0, 25]); // output

    var areaMin = d3.area()
        .x(function(d) { return xStart+d.bin*binStep; })
        .y0(function(d) { return y; })
        .y1(function(d) { return y-yScale(d.min)})
        .curve(d3.curveCatmullRom);

    svgStore.detailView.selectAll(".RackSummaryMin"+rack).remove();
    svgStore.detailView.append("path")
        .datum(arr3) // 10. Binds data to the line
        .attr("class", "RackSummary RackSummaryMin"+rack)
        .attr("stroke","#000")
        .attr("stroke-width",0.2)
        .attr("d", areaMin)
        .style("fill-opacity",1)
        .style("fill","#99d");

    var areaMax = d3.area()
        .x(function(d) { return xStart+d.bin*binStep; })
        .y0(function(d) { return y; })
        .y1(function(d) { return y-yScale(d.max)})
        .curve(d3.curveCatmullRom);

    svgStore.detailView.selectAll(".RackSummaryMax"+rack).remove();
    svgStore.detailView.append("path")
        .datum(arr3) // 10. Binds data to the line
        .attr("class", "RackSummary RackSummaryMax"+rack)
        .attr("stroke","#000")
        .attr("stroke-width",0.2)
        .attr("d", areaMax)
        .style("fill-opacity",1)
        .style("fill","#e99");

    if (rack==1) {
        svgStore.detailView.selectAll(".baseline").remove();
        svgStore.detailView.append("line")
            .attr("class", "RackSummary baseline")
            .attr("x1", xStart)
            .attr("x2", maxX+10)
            .attr("y1", y-yScale(baseTemperature))
            .attr("y2", y-yScale(baseTemperature))
            .attr("class", "baseline")
            .attr("stroke","#000")
            .attr("stroke-width",0.5);

        svgStore.detailView.selectAll(".baselineText").remove();
        svgStore.detailView.append("text")
            .attr("class", "RackSummary baselineText")
            .attr("x", 12+maxX)
            .attr("y", y+2)
            .attr("fill", "#000")
            .style("text-anchor", "start")
            .style("font-size", "12px")
            .style("text-shadow", "1px 1px 0 rgba(255, 255, 255")
            .attr("font-family", "sans-serif")
            .text("60°F");
    }
}

function getHostY(r,n,pos){
    if (pos!== undefined)
        return  racksnewor[(r - 1)*2+pos].y + Math.ceil(n/2) * h_rack / (maxHostinRack+0.5);
    else
        return  racks[r - 1].y + n * h_rack / (maxHostinRack+0.5);
    // return  racks[r - 1].y + n * h_rack / (maxHostinRack+0.5);
}

function pauseRequest(){
    // clearInterval(interval2);
    var e = d3.select('.pause').node();
    if (e.value=="false"){
        playchange();
    }else {
        clearclone();
        pausechange();
    }

}
function realTimeRequest(){
    clearclone();
    var e = d3.select('.record').node();
    if (e.value ==="false"){
        e.value = "true";
        $(e).addClass('active');
        $(e.querySelector('i')).removeClass('fa-pause pauseicon').addClass('fa-play pauseicon');
        realTimesetting (true);
        console.log('online');
    }else {
        e.value = "false";
        $(e).removeClass('active');
        $(e.querySelector('i')).removeClass('fa-pause pauseicon').addClass('fa-play pauseicon');
        realTimesetting (false);
        console.log('offline');
    }

}
function realTimesetting (option){
    isRealtime = option;
    if (option){
        simDuration = 1000;
        simDurationinit = 1000;
        numberOfMinutes = 26*60;
    }else{
        simDuration =0;
        simDurationinit = 0;
        numberOfMinutes = 26*60;
    }
    resetRequest();
}
function playchange(){
    var e = d3.select('.pause').node();
    interval2.pause();
    e.value = "true";
    $(e).addClass('active');
    $(e.querySelector('i')).removeClass('fa-pause pauseicon').addClass('fa-play pauseicon');
    svg.selectAll(".connectTimeline").style("stroke-opacity", 0.1);
}

function pausechange(){
    var e = d3.select('.pause').node();
    interval2.resume();
    e.value = "false";
    $(e).removeClass('active');
    $(e.querySelector('i')).removeClass('fa-play pauseicon').addClass('fa-pause pauseicon');
    svg.selectAll(".connectTimeline").style("stroke-opacity", 1);
}

function resetRequest(){
    pausechange();
    tool_tip.hide();
    firstTime = true;
    interval2.stop();
    hostResults = {};
    var count =0;
    for (var att in hostList.data.hostlist) {
        // to contain the historical query results
        hostResults[att] = {};
        hostResults[att].index = count;
        hostResults[att].arr = [];
        hostResults[att].arrTemperature = [];
        hostResults[att].arrCPU_load = [];
        hostResults[att].arrMemory_usage = [];
        hostResults[att].arrFans_health= [];
        hostResults[att].arrPower_usage= [];
        count++;

        svg.selectAll("."+att).remove();
    }
    svg.selectAll(".graphsum").remove();
    svg.selectAll(".connectTimeline").style("stroke-opacity", 1);
    Radarplot.init();
    TSneplot.reset(true);
    timelog = [];
    // updateTimeText();
    request();
}
function loadData(){

}
function addDatasetsOptions() {
    var select = document.getElementById("datasetsSelect");
    for(var i = 0; i < serviceList.length; i++) {
        var opt = serviceList[i];
        var el = document.createElement("option");
        el.textContent = opt;
        el.value = opt;
        el["data-image"]="images/"+serviceList[i]+".png";
        select.appendChild(el);
    }
    d3.select(select).on("change",loadNewData);
    document.getElementById('datasetsSelect').value = initialService;  //************************************************
    selectedService = document.getElementById("datasetsSelect").value;
    //loadData();
}

function loadNewData(event) {
    //alert(this.options[this.selectedIndex].text + " this.selectedIndex="+this.selectedIndex);
    //svg.selectAll("*").remove();
    selectedService = this.options[this.selectedIndex].text;

    setColorsAndThresholds(selectedService);
    drawLegend(selectedService,arrThresholds, arrColor,dif);
    resetRequest();
    tool_tip.hide();
}

// speed up process
function fastForwardRequest() {
    speedup = true;
}

function requestService(count,serin) {
    return new Promise(function(resolve, reject) {
        const xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function(e) {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    var result = processResult(JSON.parse(this.responseText));
                    var name = result.data.service.host_name;
                    hostResults[name][serviceListattr[serin]].push(result);
                    if (selectedService === serviceList[serin]) {
                        hostResults[name].arr = hostResults[name][serviceListattr[serin]];
                        plotResult(result);
                    }
                    resolve(xhr.response);
                } else {
                    reject(xhr.status);
                }
            }
        };
        xhr.ontimeout = function () {
            reject('timeout');
        };
        xhr.open('get', "http://10.10.1.4/nagios/cgi-bin/statusjson.cgi?query=service&hostname=" + hosts[count].name + "&servicedescription=check+"+serviceQuery[db][serin], true);
        xhr.send();
    })
}
function requestServiceInFlux(count,serin) {
    return new Promise(function(resolve, reject) {
        const xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function(e) {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    var result = processResult(JSON.parse(this.responseText));
                    var name = result.data.service.host_name;
                    hostResults[name][serviceListattr[serin]].push(result);
                    if (selectedService === serviceList[serin]) {
                        hostResults[name].arr = hostResults[name][serviceListattr[serin]];
                        plotResult(result);
                    }
                    resolve(xhr.response);
                } else {
                    reject(xhr.status);
                }
            }
        };
        xhr.ontimeout = function () {
            reject('timeout');
        };
        xhr.open('get', "http://10.10.1.4:8086/query?db=hpcc_test&q=" + hosts[count].name + " WHERE host='10.101.1.1' LIMIT 1"+serviceQuery[db][serin], true);
        xhr.send();
    })
}

function requestRT(iteration,count) {
    var promises =  serviceList.map(function (d,i){
        return requestService(count,i);
    });
    return Promise.all(promises).then(()=>{return [iteration, count];});
}

function step (iteration, count){
    if (isRealtime){
            return requestRT(iteration,count);
    }
    else{
        // var result = simulateResults(hosts[count].name);
            var tmp = iteration;
            for (i = 0; i < iterationstep; i++) {
                var result = simulateResults2(hosts[count].name, iteration, selectedService);
                // Process the result
                var name = result.data.service.host_name;
                hostResults[name].arr.push(result);
                //console.log(hosts[count].name+" "+hostResults[name]);
                var result = simulateResults2(hosts[count].name, iteration, serviceList[0]);
                hostResults[name].arrTemperature.push(result);

                var result = simulateResults2(hosts[count].name, iteration, serviceList[1]);
                hostResults[name].arrCPU_load.push(result);

                var result = simulateResults2(hosts[count].name, iteration, serviceList[2]);
                hostResults[name].arrMemory_usage.push(result);

                var result = simulateResults2(hosts[count].name, iteration, serviceList[3]);
                hostResults[name].arrFans_health.push(result);

                var result = simulateResults2(hosts[count].name, iteration, serviceList[4]);
                hostResults[name].arrPower_usage.push(result);

                plotResult(result);
                iteration++;
            }
            iteration = tmp;
        return [iteration, count];
    }
    //return [iteration, count];
}

d3.select("html").on("keydown", function() {
    switch(d3.event.keyCode){
        case 27:
            tool_tip.hide();
            break;
        case 13:
            pauseRequest();
            break;
    }

});

// ui part
function openNav() {
    d3.select("#mySidenav").classed("sideIn",true);
    d3.select("#Maincontent").classed("sideIn",true);
    // _.delay(resetSize, 500);
}

function closeNav() {
    d3.select("#mySidenav").classed("sideIn",false);
    d3.select("#Maincontent").classed("sideIn",false);
    // _.delay(resetSize, 500);
}

$( document ).ready(function() {
    console.log('ready');
    $('.tabs').tabs();
    $('.sidenav').sidenav();
    discovery('#sideNavbtn');
    //$('.tap-target').tapTarget({onOpen: discovery});

    d3.select("#DarkTheme").on("click",switchTheme);

    d3.select('#inds').on("change", function () {
        var sect = document.getElementById("inds");
        charType = sect.options[sect.selectedIndex].value;
    });

    d3.select('#indsg').on("change", function () {
        var sect = document.getElementById("indsg");
        sumType = sect.options[sect.selectedIndex].value;
        svg.select(".graphsum").remove();
        pannelselection(false);
        switch(sumType){
            case "Scatterplot":
                d3.select("#scatterzone").style("visibility","visible");
                svg.selectAll(".graphsum").remove();
                for (var i =currentlastIndex>(maxstack-2)?(currentlastIndex-maxstack+2):0; i<(currentlastIndex+1);i++) {
                    drawsummary(i);
                }
                break;
            case "Boxplot":
            case "Radar":
                // svg.selectAll(".graphsum").remove();
                // d3.select("#scatterzone").style("visibility","hidden");
                // for (var i =currentlastIndex>(maxstack-2)?(currentlastIndex-maxstack+2):0; i<(currentlastIndex+1);i++) {
                //     drawsummary(i);
                // }
                break;
        }
    });
    d3.select('#datacom').on("change", function () {
        d3.select('.cover').classed('hidden', false);
        spinner.spin(target);
        const choice = this.value;
        const choicetext = d3.select('#datacom').node().selectedOptions[0].text;
        setTimeout(() => {
            if (choice !== "realtime")
                d3.json("data/" + choice + ".json", function (error, data) {
                    if (error) throw error;
                    sampleS = data;
                    realTimesetting(false);
                    d3.select(".currentDate")
                        .text("" + d3.timeParse("%d %b %Y")(choicetext).toDateString());
                    resetRequest();
                    d3.select('.cover').classed('hidden', true);
                    spinner.stop();
                });
            else {
                realTimesetting(true);
                d3.select('.cover').classed('hidden', true);
                spinner.stop();
            }
        },0);
    });
    spinner = new Spinner(opts).spin(target);
    setTimeout(() => {
        d3.json("data/" + d3.select('#datacom').node().value  + ".json", function (error, data) {
            if (error) throw error;
            d3.select(".cover").select('h5').text('drawLegend...');
            d3.select(".currentDate")
                .text("" + d3.timeParse("%d %b %Y")(d3.select('#datacom').select('[selected="selected"]').text()).toDateString());
            drawLegend(initialService, arrThresholds, arrColor, dif);
            sampleS = data;
            main();
            d3.select(".cover").select('h5').text('loading data...');
            addDatasetsOptions(); // Add these dataset to the select dropdown, at the end of this files
            d3.select('.cover').classed('hidden',true);
            spinner.stop();
        });
    },0);
    // Spinner Stop ********************************************************************

});
function discovery(d){
    d3.select(d).style('left','20px')
        .classed("pulse",true)
        .transition().delay(5000).duration(1000)
        .style('left',null).on('end',function() {
            d3.select(d).classed("pulse",false);
    });

}
function switchTheme(){
    if (this.value==="light"){
        this.value = "dark";
        this.text = "Light";
        d3.select('body').classed('light',false);
        d3.select('.logoLink').select('img').attr('src',"https://idatavisualizationlab.github.io/HPCC/HiperView/images/TTUlogoWhite.png");
        return;
    }
    this.value = "light";
    this.text = "Dark";
    d3.select('body').classed('light',true);
    d3.select('.logoLink').select('img').attr('src',"https://idatavisualizationlab.github.io/HPCC/HPCViz/images/TTUlogo.png");
    return;
}