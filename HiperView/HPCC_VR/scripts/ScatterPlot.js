function ScatterPlot( data, bin_size, scale )
{
    // building scatter plot
    var population = data.length;

    var x = setInfo( 0 );
    var y = setInfo( 1 );
    var z = setInfo( 2 );

    var graph = new THREE.Group();
    var grid = setGrid();
    var points = setPoints();

    graph.add( grid );
    graph.add( points );

    this.graph = graph;
    this.grid = grid;
    this.points = points;


    // functions

    function fit( val, axis )
    {
        // console.log(axis);

        if( axis.range == 0 ) return 0;

        return scale * (val - axis.min) / axis.range;
    }

    function setInfo( axis )
    {
        var info = {};
        var max = data[0][axis];
        var min = data[0][axis];

        for( var i=0; i<population; i++ )
        {
            var p = data[i][axis];
            max = max > p ? max : p;
            min = min < p ? min : p;
        }

        info.max = max;
        info.min = min;
        info.range = max - min;
        info.name = axis == 0 ? "x" : axis == 1 ? "y" : "z";
        info.legend = "long long title";

        return info;
    }

    function setGrid()
    {
        var grid = new THREE.Group();

        // box
        var box_material = new THREE.LineBasicMaterial( { color: 0x000000, linewidth: 1 } );
        var box_geometry = new THREE.Geometry();
        box_geometry.vertices.push( new THREE.Vector3( 0, 0, 0 ), 
                                    new THREE.Vector3( scale, 0, 0 ),
                                    new THREE.Vector3( scale, scale, 0 ),
                                    new THREE.Vector3( 0, scale, 0 ),
                                    new THREE.Vector3( 0, 0, 0 ),
                                    new THREE.Vector3( 0, 0, scale ),
                                    new THREE.Vector3( scale, 0, scale ),
                                    new THREE.Vector3( scale, scale, scale ),
                                    new THREE.Vector3( 0, scale, scale ),
                                    new THREE.Vector3( 0, 0, scale ),
                                    new THREE.Vector3( 0, scale, scale ),
                                    new THREE.Vector3( 0, scale, 0 ),
                                    new THREE.Vector3( scale, scale, 0 ),
                                    new THREE.Vector3( scale, scale, scale ),
                                    new THREE.Vector3( scale, 0, scale ),
                                    new THREE.Vector3( scale, 0, 0 ) );
        var box = new THREE.Line( box_geometry, box_material );

        grid.add( box );
        grid.add( setMarks() );

        addAxisLegend( grid, x );
        addAxisLegend( grid, y );
        addAxisLegend( grid, z );

        function setMarks()
        {
            var marks = new THREE.Group();
            var no_marks = 5;
            var xmark = [];
            var ymark = [];
            var zmark = [];

            var mark_material = new THREE.LineBasicMaterial( { color: 0x000000, linewidth: 1 } );
            var mark_length = -1*scale/15;
            var line, mark_geometry, v, start, end;

            for( var i=0; i<no_marks; i++ )
            {
                v = scale * i/(no_marks-1);

                // x marks
                mark_geometry = new THREE.Geometry();
                start = new THREE.Vector3( v, 0, scale );
                end = new THREE.Vector3( v, mark_length, scale );
                mark_geometry.vertices.push( start, end );
                line = new THREE.Line( mark_geometry.clone(), mark_material.clone() );
                addIntervalLegend( line, x, i, end );
                xmark.push( line );
                marks.add(xmark[i]);

                // y marks
                mark_geometry = new THREE.Geometry();
                start = new THREE.Vector3( 0, v, 0 );
                end = new THREE.Vector3( 0, v, mark_length );
                mark_geometry.vertices.push( start, end );
                line = new THREE.Line( mark_geometry.clone(), mark_material.clone() );
                addIntervalLegend( line, y, i, end );
                ymark.push( line );
                marks.add( ymark[i] );

                // z marks
                mark_geometry = new THREE.Geometry();
                start = new THREE.Vector3( 0, 0, v );
                end = new THREE.Vector3( mark_length, 0, v );
                mark_geometry.vertices.push( start, end );
                line = new THREE.Line( mark_geometry.clone(), mark_material.clone() );
                addIntervalLegend( line, z, i, end );
                zmark.push( line );
                marks.add(zmark[i]);

            }

            function addIntervalLegend( obj, axis, interval, pos )
            {

                var num = axis.min + axis.range * interval / (no_marks-1);
                num = Math.round(num*100)/100;
                // console.log(legend);

                var loader = new THREE.FontLoader();
                var legend_material = new THREE.MeshBasicMaterial( { color: 0xff0000 } );

                loader.load( 'media/fonts/helvetiker_regular.typeface.json', function ( font ) {

                    var legend_geometry = new THREE.TextGeometry( num + "", {
                        font: font,
                        size: scale/30,
                        height: 0,
                        curveSegments: 12,
                        bevelEnabled: false
                    } );

                    var legend = new THREE.Mesh( legend_geometry, legend_material );

                    if( axis.name == "x" )
                        legend.position.set( pos.x, pos.y + mark_length/2, pos.z );
                    if( axis.name == "y" )
                    {
                        legend.position.set( pos.x, pos.y, pos.z );
                        legend.rotation.set( 0, Math.PI/2, 0 );
                    }
                    if( axis.name == "z" )
                    {
                        legend.position.set( pos.x + mark_length/2, pos.y, pos.z );
                        legend.rotation.set( Math.PI/-2, 0, Math.PI/-2 );
                    }

                    obj.add( legend );
                } );

            }

            return marks;
        }

        function addAxisLegend( obj, axis )
        {
            var loader = new THREE.FontLoader();
            var legend_material = new THREE.MeshBasicMaterial( { color: 0x0000ff } );

            loader.load( 'media/fonts/helvetiker_regular.typeface.json', function ( font ) {

                var legend_geometry = new THREE.TextGeometry( axis.legend, {
                    font: font,
                    size: scale/20,
                    height: 0,
                    curveSegments: 12,
                    bevelEnabled: false
                } );

                var legend = new THREE.Mesh( legend_geometry, legend_material );

                if( axis.name == "x" )
                    legend.position.set( 0, scale/-4, scale );
                if( axis.name == "y" )
                {
                    legend.position.set( 0, 0, scale/-4 );
                    legend.rotation.set( 0, Math.PI/2, 0 );
                }
                if( axis.name == "z" )
                {
                    legend.position.set( scale/-4, 0, 0 );
                    legend.rotation.set( Math.PI/-2, 0, Math.PI/-2 );
                }

                obj.add( legend );
            } );
        }

        return grid;
    }

    function setPoints()
    {
        var points = new THREE.Group();

        for( var p=0; p<population; p++ )
        {
            var material = new THREE.MeshBasicMaterial( { color: 0x000000 } );
            var geometry = new THREE.SphereGeometry( 0.005, 8, 8 );
            var point = new THREE.Mesh( geometry, material );

            point.position.set( fit( data[p][0], x ), fit( data[p][1], y ), fit( data[p][2], z )  );
            points.add( point );
        }

        return points;
    }

}