import $ from 'jquery';
import * as d3 from 'd3';

/**
 * The logic for our report is contained in this class.
 * We have create several functions to split up the logic, which increases maintainability.
 */
export class Report {

  constructor(setup) {
    this.setup = setup;
    this.sorting = ID_SORTING_BY_NAME;
  }

  /**
   * Creates a configuration object according to the reporting frameworks specification (see: TODO).
   */
  createConfig() {
    const promise = this.retrieveTagData().then((result) => {
      let tagArray = [];
      result.allFactSheets.edges.forEach(edge => {
        edge.node.tags.forEach(tag => {
          if(!this.containsObject(tag, tagArray)) {
            tagArray.push({
              name: tag.name,
              factSheetCount: tag.factSheetCount,
              tagGroup: tag.tagGroup,
              status: tag.status
            });
          }
        })
      });
      let sortedTagArray = _.sortBy(tagArray, ['factSheetCount']);
      //console.log("sortedtagArray", sortedTagArray);
      return sortedTagArray;
    }).then(res => {
      // console.log("Res", res);
      this.drawTagCloud(this.constructD3ObjectData(res));
    });

    return {};
  }

  retrieveTagData () {
    return lx.executeGraphQL(`{
      allFactSheets(factSheetType:Application) {
        totalCount
        edges {
          node {
            name
            tags {
              status
            	name
            	factSheetCount
              tagGroup {
                 name
               }
            }
          }
        }
      }
    }`).then(
      function(res) {
        return res;
      },
      function(err) {
        console.log("error:" + err);
      }
    );
  }


  constructD3ObjectData (data) {
    //console.log("data", data);

    var d3Object = {
      "name": "bosch-tag-cloud",
      "children": []
    };
    var tagGroupArray = [];

    // get all existing tag-groups
    data.forEach(entry => {
      if(entry.tagGroup === null) {
        if(!(tagGroupArray.indexOf(entry.tagGroup) > -1)) {
          tagGroupArray.push(entry.tagGroup);
        }
      } else {
        if(!(tagGroupArray.indexOf(entry.tagGroup.name) > -1)) {
          tagGroupArray.push(entry.tagGroup.name);
        }
      }
    });

    // map corresponding data
    tagGroupArray.forEach(tagGroup => {
      // console.log("A tagGroup", tagGroup);

      if(tagGroup != null) {
        var d3EntriesArray = [];

        var tagGroupedData = data.filter((el) => {
          if(el.tagGroup === null) {
            return (el.tagGroup === tagGroup && el.status === 'ACTIVE');
          } else {
            return (el.tagGroup.name === tagGroup && el.status === 'ACTIVE');
          }
        });

        var tagGroupedDataUnique = this.removeDuplicateUsingFilter(tagGroupedData);

        tagGroupedDataUnique.forEach(data => {
          d3EntriesArray.push({
            name: data.name,
            size: data.factSheetCount
          });
          // d3Object["name"] = tagGroup.name;
          // d3Object["children"] = d3EntriesArray;
        });
        var tmp = {
          "name": tagGroup,
          "children": d3EntriesArray
        }
        d3Object.children.push(tmp);
      } else {
          var d3EntriesArray = [];
          var tagGroupedData = data.filter((el) => {
            if(el.tagGroup === null) {
              return (el.tagGroup === tagGroup && el.status === 'ACTIVE');
            } else {
              return (el.tagGroup.name === tagGroup && el.status === 'ACTIVE');
            }
          });
          var tagGroupedDataUnique = this.removeDuplicateUsingFilter(tagGroupedData);

          //console.log("tagGroupedDataUnique", tagGroupedDataUnique);
          // console.log("bla", tagGroupedData);
          tagGroupedDataUnique.forEach(data => {
            d3EntriesArray.push({
              name: data.name,
              size: data.factSheetCount
            });
          });

          var tmp = {
            "name": null,
            "children": d3EntriesArray
          }
          d3Object.children.push(tmp);
        }
    });
    console.log("d3Object", d3Object);
    return d3Object;
  }

  removeDuplicateUsingFilter(arr) {
    arr = arr.filter((el, index, self) =>
      index === self.findIndex((t) => (
        t.name === el.name
      ))
    );
    return arr;
  }


  drawTagCloud (tagData) {
    var diameter = 960,
        format = d3.format(",d"),
        color = d3.scaleOrdinal().range(['#e0e0e0','#5b5b4c','#92d14f', '#ff0000', '#fff600']);

    var bubble = d3.pack()
        .size([diameter, diameter])
        .padding(1.5);

    var svg = d3.select("body").append("svg")
        .attr("width", diameter)
        .attr("height", diameter)
        .attr("class", "bubble");

    var root = d3.hierarchy(classes(tagData))
        .sum(function(d) { return d.value; })
        .sort(function(a, b) { return b.value - a.value; });

    bubble(root);
    var node = svg.selectAll(".node")
        .data(root.children)
      .enter().append("g")
        .attr("class", "node")
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

    node.append("title")
        .text(function(d) { return d.data.className + ": " + format(d.value); });

    node.append("circle")
        .attr("r", function(d) { return d.r; })
        .style("fill", function(d) {
          return color(d.data.packageName);
        });

    node.append("text")
        .attr("dy", ".3em")
        .style("text-anchor", "middle")
        .text(function(d) { return d.data.className.substring(0, d.r / 3); });

    // Returns a flattened hierarchy containing all leaf nodes under the root.
    function classes(root) {
      var classes = [];

      function recurse(name, node) {
        if (node.children) node.children.forEach(function(child) { recurse(node.name, child); });
        else classes.push({packageName: name, className: node.name, value: node.size});
      }

      recurse(null, root);
      return {children: classes};
    }
    d3.select(self.frameElement).style("height", diameter + "px");
  }

  // When comparing JSON objects the ORDER of keyValuePairs plays a role.
  containsObject(obj, tagList) {
    var i;
    for (i = 0; i < tagList.length; i++) {
      if (JSON.stringify(tagList[i]) === JSON.stringify(obj)) {
          return true;
      }
    }
    return false;
  }
}
