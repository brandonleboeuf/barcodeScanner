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
  const [aventriData, setAventriData] = useState({})
  const [manualCheckIn, setManualCheckIn] = useState()
  const [aventriAccessToken, setAventriAccessToken] = useState()
  const [aventriMessage, setAventriMessage] = useState()

  const [playGoodSound] = useSound(goodBeep)
  const [playBadSound] = useSound(errorBeep)
  const inputEl = useRef(null)

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
      .then((result) => result)
      .catch((error) => console.log('error', error))

    const { accesstoken } = await JSON.parse(data)
    if (accesstoken) setAventriAccessToken(accesstoken)
  }

  const getData = useCallback(async () => {
    if (!aventriAccessToken) return
    console.log('FETCH: getData')
    const requestOptions = {
      method: 'GET',
      redirect: 'follow',
    }
    const getAttendees = await fetch(
      `https://api-na.eventscloud.com/api/v2/ereg/listAttendees.json?accesstoken=${aventriAccessToken}&eventid=${AVENTRI_EVENT_ID}`,
      requestOptions
    )
      .then((response) => response.text())
      .then((result) => result)
      .catch((error) => console.dir(error))

    const jasonData = await JSON.parse(getAttendees)
    let tempObject = {}
    if (Array.isArray(jasonData)) {
      jasonData.forEach((record) => {
        const [firstName, lastName] = record.name.split(' ')
        const obj = {
          id: record.attendeeid,
          firstName: firstName,
          lastName: lastName,
        }
        tempObject[record.attendeeid] = obj
      })
    } else {
      // if Aventri accesToken is stale, call getData recursively
      getData()
    }
    setAventriData(tempObject)
  }, [aventriAccessToken])

  useEffect(() => {
    getData()
  }, [getData])

  useEffect(() => {
    getAuthToken()
  }, [])

  const aventriCheckedIn = async (id) => {
    const formdata = new FormData()
    console.log('FETCH: aventriCheckIn')

    const requestOptions = {
      method: 'POST',
      body: formdata,
      redirect: 'follow',
    }

    const message = await fetch(
      `${AVENTRI_CHECK_IN_URL}${aventriAccessToken}&eventid=${AVENTRI_EVENT_ID}&attendeeid=${id}`,
      requestOptions
    )
      .then((response) => response.text())
      .then((result) => result)
      .catch((error) => error)

    return JSON.parse(message)
  }

  const handleCapture = async (result) => {
    setOpenScan(false)
    const data = await aventriCheckedIn(result)
    handleCheckIn(result, data)
  }

  const handleCheckIn = (result, data) => {
    if (data?.description) {
      playGoodSound()
      setAventriMessage({ id: result, success: data.description })
    } else if (data?.error?.data) {
      playBadSound()
      setAventriMessage({ id: result, error: data?.error.data })
    } else {
      setAventriMessage({ error: 'Something went wrong. Please try again' })
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setAventriMessage('')

    for (let item in aventriData) {
      if (
        aventriData[item].firstName.toLowerCase().trim() ===
          e.target.firstName.value.toLowerCase().trim() &&
        aventriData[item].lastName.toLowerCase().trim() ===
          e.target.lastName.value.toLowerCase().trim()
      ) {
        setManualCheckIn({
          found: 'found',
          id: aventriData[item].id,
          firstName: e.target.firstName.value,
          lastName: e.target.lastName.value,
        })
        return
      } else if (aventriData[item].id.trim() === e.target.id.value.trim()) {
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
      firstName: e.target.firstName.value,
      lastName: e.target.lastName.value,
    })
  }

  const handleOpen = () => {
    getAuthToken()
    getData()
    setOpenScan(true)
    setSearchOpen(false)
    setManualCheckIn('')
    setAventriMessage('')
  }
  const handleClose = () => {
    setOpenScan(false)
    setAventriMessage('')
  }
  const handleSearch = () => {
    getAuthToken()
    getData()
    setSearchOpen(!searchOpen)
    setManualCheckIn('')
    setAventriMessage('')
  }
  const handleReset = () => {
    inputEl.current.reset()
    setManualCheckIn('')
    setAventriMessage('')
  }

  return (
    <div className="App">
      <h1>Scan Barcode for access to the event.</h1>
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
          <button onClick={() => handleClose()}>Reset</button>
        </div>
      ) : (
        <div className="new_scan">
          <span className="box ">&nbsp;</span>
          <button onClick={() => handleOpen()}>New Scan</button>
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
            {aventriData[aventriMessage.id].firstName}{' '}
            {aventriData[aventriMessage.id].lastName}
          </h2>
          <p>{aventriMessage.error}</p>
        </div>
      )}
      {aventriMessage?.success && (
        <div>
          <h1 className="success">SUCCESS</h1>
          <h2>
            {aventriData[aventriMessage.id].firstName}{' '}
            {aventriData[aventriMessage.id].lastName}
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
                      <h2>Not found in database.</h2>
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
