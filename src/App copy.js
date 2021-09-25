import { useEffect, useState, useRef } from 'react'
import useSound from 'use-sound'
import goodBeep from './good_beep.mp3'
import errorBeep from './error_beep.mp3'
// import BarcodeScannerComponent from "react-webcam-barcode-scanner";
import BarcodeScannerComponent from 'react-qr-barcode-scanner'
// import Airtable from 'airtable';
// import Barcode from 'react-barcode'

import './App.css'
const AVENTRI_EVENT_ID = '640418'
const AVENTRI_CHECK_IN_URL =
  'https://api-na.eventscloud.com/api/v2/ereg/checkInAttendee.json?accesstoken='
// const KEY = process.env.REACT_APP_AIRTABLE_API_KEY

// const base = new Airtable({ apiKey: KEY }).base('appLIkbpURZaoR4qA')

function App() {
  const [data, setData] = useState('canceled')
  const [airtableData, setAirtableData] = useState({})
  const [playGoodSound] = useSound(goodBeep)
  const [playBadSound] = useSound(errorBeep)
  const [manualCheckIn, setManualCheckIn] = useState()
  const [search, setSearch] = useState(false)
  const [accessToken, setAccessToken] = useState()
  const inputEl = useRef(null)

  const dataArray = []

  for (let id in airtableData) {
    dataArray.push(id)
  }

  useEffect(() => {
    getAuthToken()
    const getData = async () => {
      // let dataObj = {}
      // await base('Table 1')
      //   .select()
      //   .eachPage(
      //     function page(records, fetchNextPage) {
      //       records.forEach((record) => {
      //         const idCode = record.get('idCode')
      //         const obj = {
      //           id: record.id,
      //           idCode,
      //           firstName: record.get('firstName'),
      //           lastName: record.get('lastName'),
      //           CheckedIn: record.get('CheckedIn'),
      //         }
      //         // setAirtableData(state => ({...state, [idCode]:obj}))
      //         dataObj[idCode] = obj
      //       })
      //       fetchNextPage()
      //     },
      //     function done(err) {
      //       if (err) {
      //         console.error(err)
      //         return
      //       }
      //     }
      //   )

      const formdata = new FormData()

      const requestOptions = {
        method: 'GET',
        body: formdata,
        redirect: 'follow',
      }

      const getAttendees = await fetch(
        'https://api-na.eventscloud.com/api/v2/ereg/listAttendees.json?accesstoken=34GpKtEzpMdwisEAnhiijJybTvKnO0s7EqipDMx6TkNeR2lBCLVT7k7QrRVf6LIoeDZGRlK9fvjTWLPfFf1ZB4sCwieie&eventid=640418',
        requestOptions
      )
        .then((response) => response.text())
        .then((result) => result)
        .catch((error) => error)
      console.log({ getAttendees })
      setAirtableData(getAttendees)
    }

    getData()
  }, [])
  console.log(airtableData)

  const evaluateData = () => {
    if (data && data !== 'canceled' && airtableData[data]?.CheckedIn) {
      playBadSound()
    } else if (
      data &&
      data !== 'canceled' &&
      airtableData[data] === undefined
    ) {
      playBadSound()
    } else if (data && data !== 'canceled') {
      playGoodSound()
      setAventriCheckedIn(data)
      // base('Table 1').update(
      //   [
      //     {
      //       id: airtableData[data].id,
      //       fields: {
      //         CheckedIn: true,
      //       },
      //     },
      //   ],
      //   function (err, records) {
      //     if (err) {
      //       console.error(err)
      //       return
      //     }
      //   }
      // )
    }
  }

  const getAuthToken = async () => {
    const formdata = new FormData()
    formdata.append('accountid', '598')
    formdata.append('key', '7baf9b9d42dcde06a7000e6e51005a56d8c726b4')

    const requestOptions = {
      method: 'POST',
      body: formdata,
      redirect: 'follow',
    }

    const data = await fetch(
      'https://api-na.eventscloud.com/api/v2/global/authorize.json',
      requestOptions
    )
      .then((response) => response.text())
      .then((result) => result)
      .catch((error) => console.log('error', error))

    const { accesstoken } = JSON.parse(data)
    setAccessToken(accesstoken)
  }

  const setAventriCheckedIn = (id) => {
    const formdata = new FormData()

    const requestOptions = {
      method: 'POST',
      body: formdata,
      redirect: 'follow',
    }

    fetch(
      `${AVENTRI_CHECK_IN_URL}${accessToken}&eventid=${AVENTRI_EVENT_ID}&attendeeid=${id}`,
      requestOptions
    )
      .then((response) => response.text())
      .then((result) => console.log(result))
      .catch((error) => console.log('error', error))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    getAuthToken()

    for (let item in airtableData) {
      if (
        airtableData[item].firstName.toLowerCase().trim() ===
          e.target.firstName.value.toLowerCase().trim() &&
        airtableData[item].lastName.toLowerCase().trim() ===
          e.target.lastName.value.toLowerCase().trim()
      ) {
        setManualCheckIn({
          found: 'found',
          idCode: airtableData[item].idCode,
          id: airtableData[item].id,
          firstName: e.target.firstName.value,
          lastName: e.target.lastName.value,
        })
        return
      } else if (
        airtableData[item].idCode.trim() === e.target.idCode.value.trim()
      ) {
        setManualCheckIn({
          found: 'found',
          idCode: airtableData[item].idCode,
          id: airtableData[item].id,
          firstName: e.target.firstName.value,
          lastName: e.target.lastName.value,
        })
        return
      }
    }

    setManualCheckIn({
      found: 'not found',
      firstName: e.target.firstName.value,
      lastName: e.target.lastName.value,
    })
  }
  console.log(accessToken)

  const handleCapture = (result) => {
    getAuthToken()
    setData(result)
    evaluateData()
  }

  const handleCheckIn = () => {
    if (!airtableData[manualCheckIn.id]?.CheckedIn) {
      playGoodSound()
      setAventriCheckedIn(manualCheckIn.idCode)
      // base('Table 1').update(
      //   [
      //     {
      //       id: manualCheckIn.id,
      //       fields: {
      //         CheckedIn: true,
      //       },
      //     },
      //   ],
      //   function (err, records) {
      //     if (err) {
      //       console.error(err)
      //       return
      //     }

      //     setManualCheckIn((state) => ({ ...state, found: 'success' }))
      //   }
      // )
    } else {
      playBadSound()
    }
  }

  const runDataFetcher = () => {
    setData('')
    setSearch(false)
    setManualCheckIn('')

    // base('Table 1')
    //   .select()
    //   .eachPage(
    //     function page(records, fetchNextPage) {
    //       records.forEach(function (record) {
    //         const idCode = record.get('idCode')
    //         const obj = {
    //           id: record.id,
    //           idCode,
    //           firstName: record.get('firstName'),
    //           lastName: record.get('lastName'),
    //           CheckedIn: record.get('CheckedIn'),
    //         }
    //         setAirtableData((state) => ({ ...state, [idCode]: obj }))
    //       })
    //       fetchNextPage()
    //     },
    //     function done(err) {
    //       if (err) {
    //         console.error(err)
    //         return
    //       }
    //     }
    //   )
  }

  const handleReset = () => {
    inputEl.current.reset()
    setManualCheckIn('')
    setData('')
  }

  return (
    <div className="App">
      <h1>Scan Barcode for access to the event.</h1>
      {!data ? (
        <div className="new_scan ">
          <div className="box holder">
            <BarcodeScannerComponent
              width={400}
              height={400}
              onUpdate={(err, result) => {
                if (result && !data) handleCapture(result.text)
              }}
            />
          </div>
          <button onClick={() => setData('canceled')}>Reset</button>
        </div>
      ) : (
        <div className="new_scan">
          <span className="box ">&nbsp;</span>
          <button onClick={() => runDataFetcher()}>New Scan</button>
          <button
            style={{ fontSize: '1rem' }}
            onClick={() => setSearch(!search)}
          >
            {search ? 'Close Database Search' : 'Search Database'}
          </button>
        </div>
      )}
      {data !== 'canceled' &&
        airtableData?.[data] &&
        !airtableData?.[data]?.CheckedIn && (
          <div>
            <h1 className="success">SUCCESS</h1>
            <h2>
              {airtableData[data].firstName} {airtableData[data].lastName} has
              been checked in.
            </h2>
            <p> Enjoy the event!</p>
            <hr />
          </div>
        )}
      {airtableData[data]?.CheckedIn && (
        <div>
          <h1 className="error">ERROR</h1>
          <h2>
            {airtableData[data].firstName} {airtableData[data].lastName} has
            ALREADY been checked in...
          </h2>
          <p>Please try another code</p>
        </div>
      )}

      {data && airtableData[data] === undefined && data !== 'canceled' && (
        <div>
          <h1 className="error">ERROR</h1>
          <h2>{data} is not in the database.</h2>
          <p>Please try another code.</p>
        </div>
      )}
      <section className="codes">
        {/* SEARCH */}
        {search && (
          <div className="search_wrapper">
            <h2>Search Database</h2>
            {manualCheckIn && (
              <div>
                {manualCheckIn?.found === 'found' &&
                  !airtableData[manualCheckIn?.idCode]?.CheckedIn && (
                    <div className="found">
                      <hr />
                      <h3>Found</h3>
                      <p>
                        <strong>
                          {manualCheckIn.firstName} {manualCheckIn.lastName}{' '}
                          {manualCheckIn.idCode}:{' '}
                        </strong>
                        Found in database.
                      </p>
                      <div style={{ display: 'flex' }}>
                        <button className="add" onClick={() => handleCheckIn()}>
                          Check in manually?
                        </button>
                        <button
                          className="clear"
                          onClick={() => setManualCheckIn('')}
                        >
                          Cancel
                        </button>
                      </div>
                      <hr />
                    </div>
                  )}
                {manualCheckIn?.found === 'found' &&
                  airtableData[manualCheckIn?.idCode]?.CheckedIn && (
                    <div className="found">
                      <hr />
                      <h3>Already checked in.</h3>
                      <p>
                        <strong>
                          {manualCheckIn.firstName} {manualCheckIn.lastName}:{' '}
                        </strong>
                        Found in database, but already checked in.
                      </p>
                      <div style={{ display: 'flex' }}>
                        <button
                          className="clear"
                          onClick={() => setManualCheckIn('')}
                        >
                          Close
                        </button>
                      </div>
                      <hr />
                    </div>
                  )}

                {manualCheckIn?.found === 'not found' && (
                  <div>
                    <p>
                      <strong>
                        {manualCheckIn.firstName} {manualCheckIn.lastName}:{' '}
                      </strong>
                      Not found in database.
                    </p>
                    <button
                      className="clear"
                      onClick={() => setManualCheckIn('')}
                    >
                      Clear
                    </button>
                  </div>
                )}

                {manualCheckIn?.found === 'success' && (
                  <div>
                    <h1 className="success">SUCCESS</h1>
                    <h2>
                      {manualCheckIn.firstName} {manualCheckIn.lastName} has
                      been checked in.
                    </h2>
                    <p> Enjoy the event!</p>
                    <hr />
                  </div>
                )}
              </div>
            )}
            <form onSubmit={(e) => handleSubmit(e)} ref={inputEl}>
              <div className="form">
                <h4>Search by name:</h4>
                <label htmlFor="firstName">
                  First Name <input id="firstName" />
                </label>

                <label htmlFor="lastName">
                  Last Name <input id="lastName" />
                </label>
              </div>
              <div className="form">
                <h4>Search by Reference Number:</h4>
                <label htmlFor="idCode">
                  Reference Number <input id="idCode" />
                </label>
              </div>
              <button className="add" type="submit">
                Search
              </button>
            </form>
            <button className="clear" onClick={() => handleReset()}>
              Clear Fields
            </button>
          </div>
        )}
      </section>
      {/* show barcodes  */}
      {/* {dataArray.map((id) => (
        <div style={{marginBottom: "450px"}}>
        <Barcode id={id} value={id} />
        </div>
      ))} */}
    </div>
  )
}

export default App
