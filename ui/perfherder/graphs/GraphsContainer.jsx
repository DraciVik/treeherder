/* eslint-disable react/no-did-update-set-state
 */
import React from 'react';
import { Row } from 'reactstrap';
import PropTypes from 'prop-types';
import {
  VictoryChart,
  VictoryLine,
  VictoryAxis,
  VictoryBrushContainer,
  VictoryScatter,
  VictoryZoomContainer,
} from 'victory';
import moment from 'moment';
import debounce from 'lodash/debounce';
import last from 'lodash/last';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

import { graphColors } from '../constants';

class GraphsContainer extends React.Component {
  constructor(props) {
    super(props);
    this.updateZoom = debounce(this.updateZoom.bind(this), 500);
    this.updateSelection = debounce(this.updateSelection.bind(this), 500);
    this.tooltip = React.createRef();
    this.state = {
      selectedDomain: this.props.zoom,
      highlights: [],
      scatterPlotData: this.props.testData.flatMap(item =>
        item.visible ? item.data : [],
      ),
      entireDomain: this.getEntireDomain(),
      selectedDataPoint: null,
      showTooltip: false,
    };
  }

  componentDidMount() {
    this.addHighlights();
    this.updateData();
  }

  componentDidUpdate(prevProps) {
    const {
      zoom,
      highlightAlerts,
      highlightedRevisions,
      testData,
    } = this.props;

    if (prevProps.zoom !== zoom) {
      this.setState({ selectedDomain: zoom });
    }

    if (
      prevProps.highlightAlerts !== highlightAlerts ||
      prevProps.highlightedRevisions !== highlightedRevisions
    ) {
      this.addHighlights();
    }

    if (prevProps.testData !== testData) {
      this.updateGraphs();
    }
  }

  updateGraphs = () => {
    const { testData, updateStateParams } = this.props;
    const entireDomain = this.getEntireDomain();
    const scatterPlotData = testData.flatMap(item =>
      item.visible ? item.data : [],
    );
    this.addHighlights();
    this.setState({
      entireDomain,
      selectedDomain: {},
      scatterPlotData,
    });
    updateStateParams({ zoom: {} });
  };

  getEntireDomain = () => {
    const { testData } = this.props;
    const data = testData.flatMap(item => (item.visible ? item.data : []));
    const yValues = data.map(item => item.y);

    if (!data.length) {
      return {};
    }
    return {
      y: [Math.min(...yValues), Math.max(...yValues)],
      x: [data[0].x, last(data).x],
    };
  };

  // TODO add ? icon to chart to explain how zoom/pan works?
  addHighlights = () => {
    const { testData, highlightAlerts, highlightedRevisions } = this.props;
    let highlights = [];

    for (const series of testData) {
      if (!series.visible) {
        continue;
      }

      if (highlightAlerts) {
        const dataPoints = series.data.filter(item => item.alertSummary);
        highlights = [...highlights, ...dataPoints];
      }

      for (const rev of highlightedRevisions) {
        if (!rev) {
          continue;
        }
        // in case people are still using 12 character sha
        const dataPoint = series.data.find(
          item => item.revision.indexOf(rev) !== -1,
        );

        if (dataPoint) {
          highlights.push(dataPoint);
        }
      }
    }
    this.setState({ highlights });
  };

  // Not sure if this is needed
  getTooltipPosition = (point, yOffset = 10) => ({
    left: point.x - 250 / 2,
    top: point.y - 50 - yOffset,
  });

  updateData() {
    const { selectedDomain } = this.state;
    const { testData } = this.props;

    // we do this (along with debouncing updateSelection and updateZoom)
    // to make zooming faster by removing unneeded data points based on
    // the updated selectedDomain
    if (selectedDomain.x && selectedDomain.y) {
      const scatterPlotData = testData
        .flatMap(item => (item.visible ? item.data : []))
        .filter(
          data =>
            data.x >= selectedDomain.x[0] &&
            data.x <= selectedDomain.x[1] &&
            data.y >= selectedDomain.y[0] &&
            data.y <= selectedDomain.y[1],
        );
      this.setState({ scatterPlotData });
    }
  }

  updateSelection(selectedDomain) {
    this.setState({ selectedDomain }, this.updateData);
  }

  updateZoom(zoom) {
    this.props.updateStateParams({ zoom });
  }

  // TODO
  // - apply style to datapoint based on the selected query params
  //   and then show tooltip
  // - when another tooltip is selected or tooltip is closed,
  //   remove highlight style attributes on datapoint
  showTooltip = (dataPoint, lock = false) => {
    const { showTooltip, lockTooltip } = this.state;
    const position = this.getTooltipPosition(dataPoint);

    this.hideTooltip.cancel();
    // console.log(dataPoint.data.find(datum => datum.style.strokeOpacity === 0.3));
    this.tooltip.current.style.cssText = `left: ${position.left}px; top: ${position.top}px;`;

    if (!showTooltip || lockTooltip !== lock) {
      this.setState({
        showTooltip: true,
        lockTooltip: lock,
        selectedDataPoint: dataPoint,
      });
    }

    if (lock) {
      return {
        style: {
          ...dataPoint.style,
          ...{ fillOpacity: 100, strokeOpacity: 0.3, strokeWidth: 12 },
        },
      };
    }
  };

  // eslint-disable-next-line react/sort-comp
  hideTooltip = debounce(() => {
    const { showTooltip, lockTooltip } = this.state;
    if (showTooltip && !lockTooltip) {
      console.log('hide tooltip');
      this.setState({ showTooltip: false });
    }
  }, 250);

  closeTooltip = event => {
    event.stopPropagation();
    this.setState({ showTooltip: false });
  };

  render() {
    const { testData, zoom } = this.props;
    const {
      selectedDomain,
      highlights,
      scatterPlotData,
      entireDomain,
      showTooltip,
    } = this.state;

    return (
      <React.Fragment>
        <div
          id="graph-tooltip"
          className={showTooltip ? 'show' : 'hide'}
          ref={this.tooltip}
        >
          <div className="body">
            <span className="mr-3 my-2 ml-2" onClick={this.closeTooltip}>
              <FontAwesomeIcon
                className="pointer text-white"
                icon={faTimes}
                size="xs"
                title="close tooltip"
              />
            </span>
            Hello
          </div>
          <div className="tip" />
        </div>
        <Row>
          <VictoryChart
            padding={{ top: 10, left: 50, right: 50, bottom: 30 }}
            width={1200}
            height={125}
            scale={{ x: 'time', y: 'linear' }}
            domain={entireDomain}
            domainPadding={{ y: 30 }}
            containerComponent={
              <VictoryBrushContainer
                responsive={false}
                brushDomain={selectedDomain}
                onBrushDomainChange={this.updateZoom}
              />
            }
          >
            <VictoryAxis
              dependentAxis
              tickCount={5}
              style={{
                grid: { stroke: 'lightgray', strokeWidth: 0.5 },
              }}
            />
            <VictoryAxis
              tickCount={10}
              tickFormat={x => moment(x).format('MMM DD')}
              style={{
                grid: { stroke: 'lightgray', strokeWidth: 0.5 },
              }}
            />
            {testData.map((item, i) => (
              <VictoryLine
                key={item.name}
                data={item.visible ? item.data : []}
                style={{
                  data: { stroke: graphColors[i][1] },
                }}
              />
            ))}
          </VictoryChart>
        </Row>

        <Row>
          <VictoryChart
            width={1200}
            height={350}
            scale={{ x: 'time', y: 'linear' }}
            domain={entireDomain}
            domainPadding={{ y: 40 }}
            containerComponent={
              <VictoryZoomContainer
                responsive={false}
                zoomDomain={zoom}
                onZoomDomainChange={this.updateSelection}
              />
            }
          >
            {highlights.length > 0 &&
              highlights.map(item => (
                <VictoryLine
                  key={item}
                  style={{
                    data: { stroke: 'gray', strokeWidth: 1 },
                  }}
                  x={() => item.x}
                />
              ))}

            <VictoryScatter
              style={{
                data: {
                  fill: d => d.z,
                  fillOpacity: data => (data.alertSummary ? 100 : 0.3),
                  strokeOpacity: data => (data.alertSummary ? 0.3 : 100),
                  stroke: d => d.z,
                  strokeWidth: data => (data.alertSummary ? 12 : 2),
                },
              }}
              size={() => 3}
              data={scatterPlotData}
              events={[
                {
                  target: 'data',
                  eventHandlers: {
                    onClick: parentProps => {
                      return [
                        {
                          target: 'data',
                          mutation: props => this.showTooltip(props, true),
                          // callback: () => console.log(parentProps),
                        },
                      ];
                    },
                    onMouseOver: () => {
                      return [
                        {
                          target: 'data',
                          mutation: props => this.showTooltip(props),
                        },
                      ];
                    },
                    onMouseOut: () => {
                      return [
                        {
                          target: 'data',
                          callback: this.hideTooltip,
                        },
                      ];
                    },
                  },
                },
              ]}
            />
            <VictoryAxis
              dependentAxis
              tickCount={9}
              style={{
                grid: { stroke: 'lightgray', strokeWidth: 0.5 },
              }}
            />
            <VictoryAxis
              tickCount={10}
              // tickFormat={x => moment(x).format('MMM DD')}
              style={{
                grid: { stroke: 'lightgray', strokeWidth: 0.5 },
              }}
            />
          </VictoryChart>
        </Row>
      </React.Fragment>
    );
  }
}

GraphsContainer.propTypes = {
  testData: PropTypes.arrayOf(PropTypes.shape({})),
  updateStateParams: PropTypes.func.isRequired,
  zoom: PropTypes.shape({}),
  // selectedDataPoint: PropTypes.string,
  highlightAlerts: PropTypes.bool,
  highlightedRevisions: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string),
  ]),
};

GraphsContainer.defaultProps = {
  testData: [],
  zoom: {},
  // selectedDataPoint: null,
  highlightAlerts: true,
  highlightedRevisions: ['', ''],
};

export default GraphsContainer;