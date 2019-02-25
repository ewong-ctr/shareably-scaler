import React, { Component } from 'react';
import axios from 'axios';
import regression from 'regression';
import './App.css';

const config = require('./config.js').newInstance();
const moment = require('moment');
const querystring = require('querystring');
const SHAREABLY_API_SERVER_URL = 'http://api.shareably.net:3030';

const BUDGET_KEY = 'budget';
const SPEND_KEY = 'spend';
const REVENUE_KEY = 'revenue';
const IMPRESSIONS_KEY = 'impressions';
const ROAS_KEY = 'ROAS'; // Return on Ad Spend
const PPI_KEY = 'PPI'; // Profit Per Impression
const AVERAGE_ROAS_KEY = 'averageROAS';
const REGRESSION_KEY = 'regression';
const ALL_KEYS = config.metrics.concat([ROAS_KEY, PPI_KEY]);


class DataRow extends Component {
  render() {
    const adData = this.props.adData;
    const dataKeys = this.props.dataKeys;

    const rowData = [];
    dataKeys.forEach((key) => {
      let data = adData[key];

      if (isNaN(data) || data === parseInt(data, 10)) {
        rowData.push(<td>{adData[key]}</td>);
      } else { // Show to 3 decimal places for numbers that are not integers
        rowData.push(<td>{adData[key].toFixed(3)}</td>);
      }
    });

    return (
      <tr>
        <td>{this.props.date}</td>
        {rowData}
      </tr>
    );
  }
}

class DataTable extends Component {
  render() {
    const headers = [];
    const rows = [];
    const adData = this.props.adData;
    const dataKeys = this.props.dataKeys;

    dataKeys.forEach((k) => {
      headers.push(
        <th>{k}</th>
      );
    });

    Object.keys(adData).forEach((date) => {
      rows.push(
        <DataRow
          adData={adData[date]} 
          date={date}
          dataKeys={dataKeys} />
      );
    });

    return (
      <div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              {headers}
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    );
  }
}

class SummaryTable extends Component {
  toPercent(num) {
    return (num * 100).toFixed(3);
  }
  render() {
    const rows = [];
    const adData = this.props.adData;
    const summaryData = this.props.summaryData;

    Object.keys(adData).forEach((id) => {
      let currBudget = 'unknown';
      let avgROAS = 'unknown';
      let regressionROAS = 'unknown';
      if (summaryData[id]) {
        if (BUDGET_KEY in summaryData[id]) {
          currBudget = summaryData[id][BUDGET_KEY];
        }
        if (AVERAGE_ROAS_KEY in summaryData[id]) {
          avgROAS = `${this.toPercent(summaryData[id][AVERAGE_ROAS_KEY])}%`;
        }
        if (REGRESSION_KEY in summaryData[id]) {
          regressionROAS = summaryData[id][REGRESSION_KEY].toFixed(3);
        }
      }
      rows.push(
        <tr>
          <td>{id}</td>
          <td>{currBudget}</td>
          <td>?</td>
          <td>{avgROAS}</td>
          <td>{regressionROAS}</td>
        </tr>
      );
    });

    return (
      <div>
        <table>
          <thead>
            <tr>
              <th>Ad ID</th>
              <th>Current Budget</th>
              <th>Proposed Budget</th>
              <th>Average ROAS</th>
              <th>ROAS Trend</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    );
  }
}

class App extends Component {

  state = {
    adData: [],
    adSummaries: []
  }

  componentDidMount() {
    /*
    const startDate = moment(config.startDate, 'YYYY-MM-DD');
    const endDate = moment(config.endDate, 'YYYY-MM-DD');
    let currentDate = startDate;

    const metricsStr = config.metrics.join(',');

    while (currentDate <= endDate) {
      console.log(`processing ${currentDate}`);
      this.populateData(config.shareablyAccessToken, currentDate.format('YYYY-MM-DD'), metricsStr);

      currentDate = currentDate.add(1, 'days');
    }
    */
   this.dateLoop();

  }
  
  async dateLoop() {
    try {
      await this.populateAdData();

      let allAds = {};
      Object.values(this.state.adData).forEach((date) => {
        Object.values(date).forEach((ad) => {
          if (ad['id']) {
            allAds[ad['id']] = true;
          }
        });
      });
      console.log(Object.keys(allAds));

      if (allAds) {
        Object.keys(allAds).forEach((adId) => {
          this.getAdBudget(config.shareablyAccessToken, adId);
        });
      }
      await this.calculateRegression();
    }  catch (e) {
      console.log("Error", e);
    }
  }

  showAllData() {
    let dataObj = this.state.adData;
    if (Object.keys(dataObj).length > 0) {
      return (
        <div className="allData">
          <header className="App-header">
            Detailed Data
          </header>
          <div>
          {Object.keys(dataObj).map((adId) => {
            return (
              <div>
                {adId}
                <DataTable 
                  adData={dataObj[adId]} 
                  dataKeys={ALL_KEYS} />
              </div>
            );
          })}
          </div>
        </div>
      );
    } else {
      return (
        <div>Uh oh, error retrieving data</div>
      );
    }
  }

  render() {
    let dataObj = this.state.adData;
    if (Object.keys(dataObj).length > 0 && Object.keys(this.state.adSummaries).length > 0) {
      return (
        <div className="App">
          <header className="App-header">
            Erin's Shareably Data Analyzer
          </header>
          <div>
            <SummaryTable 
              adData={dataObj} 
              summaryData={this.state.adSummaries} />
          </div>
          <div>
            {this.showAllData()}
          </div>
        </div>
      );
    } else {
      return (
        <div>Uh oh, error retrieving data</div>
      );
    }
  }

  async populateAdData() {
    const startDate = moment(config.startDate, 'YYYY-MM-DD');
    const endDate = moment(config.endDate, 'YYYY-MM-DD');
    let currentDate = startDate;

    while (currentDate <= endDate) {
      console.log(`processing ${currentDate}`);
      try {
        await this.getAdInsightData(config.shareablyAccessToken, currentDate.format('YYYY-MM-DD'), config.metrics);
      } catch (e) {
        console.log("Error", e);
      }

      currentDate = currentDate.add(1, 'days');
    }
  }

  calculateROAS(adData) {
    return (adData[REVENUE_KEY] - adData[SPEND_KEY]) / adData[SPEND_KEY];
  }

  calculatePPI(adData) {
    return (adData[REVENUE_KEY] - adData[SPEND_KEY]) / adData[IMPRESSIONS_KEY];
  }

  calculateAverageROAS(ROAS_array) {
    const numericROAS = ROAS_array.filter(n => !isNaN(n));
    return numericROAS.reduce((a, b) => a + b) / numericROAS.length;
  }

  calculateRegression() {
    const adData = this.state.adData;

    Object.keys(adData).forEach((adId) => {
      const ad = adData[adId];
      let dataArray = [];
      let ROAS_array = [];
      let dayIdx = 0;

      Object.values(ad).forEach((dayData) => {
        const ROAS = dayData[ROAS_KEY];

        if (!isNaN(ROAS)) {
          dataArray.push([dayIdx, ROAS]);
          ROAS_array.push(ROAS);
        }
        dayIdx++;
      });

      const result = regression.linear(dataArray);
      let summaryData = this.state.adSummaries;
      summaryData[adId][REGRESSION_KEY] = result.equation[0]; // Gradient is at index 0
      summaryData[adId][AVERAGE_ROAS_KEY] = this.calculateAverageROAS(ROAS_array);

      this.setState({adSummaries: summaryData});
    });
  }

  saveAdMetrics(adData, dateStr, metricsList) {
    /**
     * Saving ad data in this.state.adData in the format
     * adData[adId][date][metricName]
     */
    const currAdData = this.state.adData;

    Object.values(adData).forEach((ad) => {
      const id = ad.id;
      currAdData[id] = currAdData[id] || {};
      currAdData[id][dateStr] = currAdData[id][dateStr] || {};
      metricsList.forEach((metricName) => {
        currAdData[id][dateStr][metricName] = ad[metricName];
      });
      currAdData[id][dateStr][ROAS_KEY] = this.calculateROAS(ad);
      currAdData[id][dateStr][PPI_KEY] = this.calculatePPI(ad);
    });

    this.setState({adData: currAdData}, () => {
      console.log(this.state.adData);
    });

  }

  async getAdInsightData(token, dateStr, metricsList) {
    const baseUrl = `${SHAREABLY_API_SERVER_URL}/ad-insights/`;
    const metricsListStr = metricsList.join(',');

    const params = {
      accessToken: token,
      date: dateStr,
      metrics: metricsListStr
    }

    const queryStr = querystring.stringify(params);

    try {
      await axios.get(`${baseUrl}?${queryStr}`)
        .then(async res => {
          await this.saveAdMetrics(res.data, dateStr, metricsList);

          if (Object.keys(this.state.adSummaries).length === 0) {
            Object.keys(this.state.adData).forEach((adId) => {
              this.getAdBudget(token, adId);
            });
          }
        });
    } catch (e) {
      console.log("Error", e);
    }
  }

  getAdBudget(token, adId) {
    /**
     * Saving budgets in this.state.adSummaries in the format
     * adSummaries[adId]['budget']
     */
    const baseUrl = `${SHAREABLY_API_SERVER_URL}/ad`;
    const params = {
      accessToken: token,
    }

    const queryStr = querystring.stringify(params);

    axios.get(`${baseUrl}/${adId}/?${queryStr}`)
    .then(res => {
      const currAdBudgets = this.state.adSummaries || {};
      currAdBudgets[adId] = currAdBudgets[adId] || {};
      currAdBudgets[adId][BUDGET_KEY] = res.data.budget;
      this.setState({adSummaries: currAdBudgets}, () => {
        console.log(this.state.adBudgets);
      });
      console.log(res);
    });
  }
}

export default App;
