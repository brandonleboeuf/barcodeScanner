import { useEffect, useState, useRef, useCallback } from 'react'

import useSound from 'use-sound'
import BarcodeScannerComponent from 'react-qr-barcode-scanner'

import goodBeep from './good_beep.mp3'
import errorBeep from './error_beep.mp3'
import './App.css'

const AVENTRI_EVENT_ID = process.env.REACT_APP_AVENTRI_EVENT_ID
const AVENTRI_KEY = process.env.REACT_APP_AVENTRI_KEY
const AVENTRI_ID = process.env.REACT_APP_AVENTRI_ID
const AVENTRI_CHECK_IN_URL =
  'https://api-na.eventscloud.com/api/v2/ereg/checkInAttendee.json?accesstoken='

function App() {
  const [openScan, setOpenScan] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [manualCheckIn, setManualCheckIn] = useState()
  const [aventriData, setAventriData] = useState({})
  const [aventriAccessToken, setAventriAccessToken] = useState()
  const [aventriMessage, setAventriMessage] = useState()
  const [eventId, setEventId] = useState(AVENTRI_EVENT_ID)
  const [changeEventId, setChangeEventId] = useState(false)
  const [error, setError] = useState()

  const [playGoodBeep] = useSound(goodBeep)
  const [playBadBeep] = useSound(errorBeep)
  const searchFormEl = useRef(null)

  const getAuthToken = async () => {
    console.log('FETCH: getAuthToken')
    const formdata = new FormData()
    formdata.append('accountid', AVENTRI_ID)
    formdata.append('key', AVENTRI_KEY)

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
      .then((result) => {
        return result
      })
      .catch((error) => console.log(error))

    const jsonData = await JSON.parse(data)
    if (jsonData.error) {
      let errorArray = []
      for (let item in jsonData) {
        errorArray.push(JSON.stringify(jsonData[item]))
      }
      setError(errorArray[0])
      return
    }

    if (jsonData.accesstoken) setAventriAccessToken(jsonData.accesstoken)
  }

  const getData = useCallback(
    async (id = null) => {
      // if (!aventriAccessToken) return
      console.log('FETCH: getData')
      const requestOptions = {
        method: 'GET',
        redirect: 'follow',
      }
      const getAttendees = await fetch(
        `https://api-na.eventscloud.com/api/v2/ereg/listAttendees.json?accesstoken=${aventriAccessToken}&eventid=${
          id || eventId
        }`,
        requestOptions
      )
        .then((response) => response.text())
        .then((result) => result)
        .catch((error) => console.log(error))

      const jsonData = await JSON.parse(getAttendees)
      if (jsonData.error) {
        let errorArray = []
        for (let item in jsonData) {
          errorArray.push(JSON.stringify(jsonData[item]))
        }
        setError(errorArray[0])
        return
      }

      let tempObject = {}
      jsonData.forEach((record) => {
        const [firstName, lastName] = record.name.split(' ')
        const obj = {
          id: record.attendeeid || null,
          firstName: firstName || null,
          lastName: lastName || null,
        }
        tempObject[record.attendeeid] = obj
      })

      setAventriData(tempObject)
    },
    [aventriAccessToken, eventId]
  )

  useEffect(() => {
    console.log('App starting up...')
    console.log('Retrieving initial access token and attendee data:')
    getAuthToken()
    if (!aventriAccessToken) return
    getData()
  }, [eventId, aventriAccessToken, getData])

  const aventriCheckedIn = async (id) => {
    console.log('FETCH: aventriCheckIn')
    const formdata = new FormData()

    const requestOptions = {
      method: 'POST',
      body: formdata,
      redirect: 'follow',
    }

    const message = await fetch(
      `${AVENTRI_CHECK_IN_URL}${aventriAccessToken}&eventid=${eventId}&attendeeid=${id}`,
      requestOptions
    )
      .then((response) => response.text())
      .then((result) => result)
      .catch((error) => console.log(error))

    const jsonData = JSON.parse(message)

    if (jsonData.error && !jsonData.error.data) {
      let errorArray = []
      for (let item in jsonData) {
        errorArray.push(JSON.stringify(jsonData[item]))
      }
      setError(errorArray[0])
      return
    }

    return jsonData
  }

  const handleCapture = async (result) => {
    console.log(result)
    setOpenScan(false)
    if (!aventriData[result]) {
      const message = 'Not found in database.'
      handleCheckIn(result, message)
      return
    }
    const data = await aventriCheckedIn(result)
    handleCheckIn(result, data)
  }

  const handleCheckIn = (result, data) => {
    if (data?.description) {
      playGoodBeep()
      setAventriMessage({ id: result, success: data.description })
    } else if (data?.error?.data) {
      playBadBeep()
      setAventriMessage({ id: result, error: data?.error.data })
    } else if (data) {
      playBadBeep()
      setAventriMessage({ error: `${result}: ${data}` })
    } else {
      setAventriMessage({ error: 'Something went wrong. Please try again' })
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setAventriMessage('')
    // if either first/last name fields have content AND id field has content,
    // alert user that they must choose one method and not both
    if (
      (e.target?.firstName.value || e.target?.lastName.value) &&
      e.target.id.value
    ) {
      setManualCheckIn({
        found: 'not found',
        message:
          'Data found in both Search fields. Please choose only one search method (Name or Ref. Number)',
      })
      return
    }

    // if both first/last name fields are empty AND id field is empty, return
    if (
      (!e.target?.firstName.value || !e.target?.lastName.value) &&
      !e.target.id.value
    )
      return
    // searches through data from Aventri to see if user being searched is in their database
    for (let item in aventriData) {
      // check by first / last name
      if (
        aventriData[item]?.firstName?.toLowerCase().trim() ===
          e.target.firstName.value?.toLowerCase().trim() &&
        aventriData[item]?.lastName?.toLowerCase().trim() ===
          e.target.lastName.value?.toLowerCase().trim()
      ) {
        setManualCheckIn({
          found: 'found',
          id: aventriData[item].id,
          firstName: e.target.firstName.value,
          lastName: e.target.lastName.value,
        })
        return
        // check by reference number
      } else if (
        aventriData[item] &&
        e.target.id.value > 1 &&
        aventriData[item].id.trim() === e.target.id.value.trim()
      ) {
        setManualCheckIn({
          found: 'found',
          id: aventriData[item].id,
          firstName: e.target.firstName.value,
          lastName: e.target.lastName.value,
        })
        return
      }
    }

    setManualCheckIn({
      found: 'not found',
      message: 'Not found in database.',
      firstName: e.target.firstName.value,
      lastName: e.target.lastName.value,
    })
  }

  // when new scan is initiated
  const handleOpen = () => {
    getData()
    setSearchOpen(false)
    setManualCheckIn('')
    setOpenScan(true)
    setAventriMessage('')
  }
  // when scanner is closed by clicking "reset"
  const handleClose = () => {
    setOpenScan(false)
    setAventriMessage('')
  }
  // when "Search Database" is clicked
  const handleSearch = () => {
    setSearchOpen(!searchOpen)
    setManualCheckIn('')
    setAventriMessage('')
    !searchOpen && getData()
  }
  // when the manual search is reset
  const handleReset = () => {
    searchFormEl.current.reset()
    setManualCheckIn('')
    setAventriMessage('')
  }

  // allows user to change the event ID
  const handleEventIdSubmit = (e) => {
    e.preventDefault()
    setSearchOpen(false)
    setChangeEventId(false)
    if (e.target.eventId.value.length <= 1) return
    setAventriData({})
    setEventId(e.target.eventId.value)
    getData(e.target.eventId.value)
  }

  const handleFactoryReset = () => {
    // all state reverted back to original state
    setAventriMessage('')
    setOpenScan(false)
    setSearchOpen(false)
    setManualCheckIn(null)
    setAventriData({})
    setAventriAccessToken(null)
    setEventId(AVENTRI_EVENT_ID)
    setChangeEventId(false)
    setError(null)
    getAuthToken()
  }

  if (error)
    return (
      <div className="App">
        <h3>Something went wrong.</h3>
        <p>
          <strong>Message:</strong>
        </p>
        <p>
          <em>{error}</em>
        </p>
        <p>Click "RESET" to restore default settings.</p>
        <button onClick={handleFactoryReset}>RESET</button>
      </div>
    )

  if (changeEventId)
    return (
      <div className="App">
        <h2>Enter the six digit Aventri event code </h2>
        <form onSubmit={handleEventIdSubmit}>
          <label htmlFor="eventId">
            Event ID: <input id="eventId" />
          </label>
          <div style={{ display: 'flex' }}>
            <button
              style={{ marginRight: '1rem' }}
              className="clear"
              onClick={() => setChangeEventId(false)}
            >
              CANCEL
            </button>
            <button className="add" type="submit">
              SAVE
            </button>
          </div>
        </form>
        <p>click RESET to use default event ID: {AVENTRI_EVENT_ID}</p>
        <button onClick={handleFactoryReset}>Reset</button>
      </div>
    )

  return (
    <div className="App">
      <div style={{ cursor: 'pointer' }}>
        <h1 onClick={() => setChangeEventId(true)}>Event ID: {eventId}</h1>
      </div>

      <h2>Scan Barcode to check in Attendee.</h2>
      {openScan ? (
        <div className="new_scan ">
          <div className="box holder">
            <BarcodeScannerComponent
              width={400}
              height={400}
              onUpdate={(err, result) => {
                if (result) handleCapture(result.text)
              }}
            />
          </div>
          <button className="clear" onClick={() => handleClose()}>
            Reset
          </button>
        </div>
      ) : (
        <div className="new_scan">
          <span className="box">&nbsp;</span>
          <button className="add" onClick={() => handleOpen()}>
            New Scan
          </button>
          <button style={{ fontSize: '1rem' }} onClick={() => handleSearch()}>
            {searchOpen ? 'Close Database Search' : 'Search Database'}
          </button>
        </div>
      )}
      {aventriMessage?.error && (
        <div>
          <h1 className="error">DENIED</h1>
          <h2>
            {' '}
            {aventriData[aventriMessage.id]?.firstName}{' '}
            {aventriData[aventriMessage.id]?.lastName}
          </h2>
          <p>{aventriMessage.error}</p>
        </div>
      )}
      {aventriMessage?.success && (
        <div>
          <h1 className="success">SUCCESS</h1>
          <h2>
            {aventriData[aventriMessage.id]?.firstName}{' '}
            {aventriData[aventriMessage.id]?.lastName}
          </h2>
          <p>Thank you for joining us! Please enjoy the event!</p>
        </div>
      )}
      <section className="codes">
        {/* SEARCH */}
        {searchOpen && (
          <div className="search_wrapper">
            <h2>Search Database</h2>
            {manualCheckIn &&
              !aventriMessage?.success &&
              !aventriMessage?.error && (
                <div>
                  {manualCheckIn?.found === 'found' && (
                    <div className="found">
                      <hr />
                      <h3>Found</h3>
                      <p>
                        <strong>
                          {aventriData[manualCheckIn.id].firstName}{' '}
                          {aventriData[manualCheckIn.id].lastName} (
                          {manualCheckIn.id}) :{' '}
                        </strong>
                        Found in database.
                      </p>
                      <div style={{ display: 'flex' }}>
                        <button
                          className="add"
                          onClick={() => handleCapture(manualCheckIn.id)}
                        >
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
                  {manualCheckIn?.found === 'not found' && (
                    <div>
                      <h2>{manualCheckIn.message}</h2>
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
            <form onSubmit={(e) => handleSubmit(e)} ref={searchFormEl}>
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
                <label htmlFor="id">
                  Reference Number <input id="id" />
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
    </div>
  )
}

export default App
