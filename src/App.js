import React, { Component } from 'react';
import axios from 'axios';
import './App.css';

const config = require('./config.js').newInstance();
const moment = require('moment');
const querystring = require('querystring');
const SHAREABLY_API_SERVER_URL = 'http://api.shareably.net:3030';
const SPEND_KEY = 'spend';
const REVENUE_KEY = 'revenue';
const IMPRESSIONS_KEY = 'impressions';


class DataRow extends Component {
  render() {
    const adData = this.props.adData;

    return (
      <tr>
        <td>{this.props.date}</td>
        <td>{adData.revenue}</td>
        <td>{adData.spend}</td>
      </tr>
    );
  }
}

class DataTable extends Component {
  render() {
    const rows = [];
    const adData = this.props.adData;

    Object.keys(adData).forEach((date) => {
      rows.push(
        <DataRow
          adData={adData[date]} 
          date={date} />
      );
    });

    return (
      <div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Revenue</th>
              <th>Spend</th>
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
    adBudgets: []
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
    }  catch (e) {
      console.log("Error", e);
    }
  }


  render() {

    let dataObj = this.state.adData;
    if (Object.keys(dataObj).length > 0) {
      return (
        <div className="App">
          <header className="App-header">
            Erin's Shareably Data Analyzer
          </header>
          <div>
          {Object.keys(dataObj).map((adId) => {
            return (
              <div>
                {adId}
                <DataTable adData={dataObj[adId]} />
              </div>
            );
          })}
          </div>
        </div>
      );

      /*
      dataObj = this.state.adData['2019-01-25'];

      return (
        <div className="App">
          <header className="App-header">
          Erin's Shareably Data Analyzer
          </header>
          Mah Data
          <table>
          <tbody>
          {dataObj.map((item,key) => {
              return (
                <tr key={key}>
                  <td>{item.spend}</td>
                  <td>{item.revenue}</td>
                  <td>{item.impressions}</td>
                  <td>{item.clicks}</td>
                  <td>{item.id}</td>
                </tr>
              )
            })}
            </tbody>
          </table>
        </div>
      );
      */
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

  saveAdMetrics(adData, dateStr, metricsList) {
    const currAdData = this.state.adData;

    Object.values(adData).forEach((ad) => {
      const id = ad.id;
      currAdData[id] = currAdData[id] || {};
      currAdData[id][dateStr] = currAdData[id][dateStr] || {};
      metricsList.forEach((metricName) => {
        currAdData[id][dateStr][metricName] = ad[metricName];
      });
      currAdData[id][dateStr]['ROAS'] = this.calculateROAS(ad);
      currAdData[id][dateStr]['PPI'] = this.calculatePPI(ad);
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

          if(Object.keys(this.state.adBudgets).length === 0) {
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
    const baseUrl = `${SHAREABLY_API_SERVER_URL}/ad`;
    const params = {
      accessToken: token,
    }

    const queryStr = querystring.stringify(params);

    axios.get(`${baseUrl}/${adId}/?${queryStr}`)
    .then(res => {
      const currAdBudgets = this.state.adBudgets;
      currAdBudgets[adId] = res.data.budget;
      this.setState({adBudgets: currAdBudgets}, () => {
        console.log(this.state.adBudgets);
      });
      console.log(res);
    });
  }
}

export default App;
