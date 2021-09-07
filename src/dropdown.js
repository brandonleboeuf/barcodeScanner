import React from 'react'
import { Dropdown } from 'semantic-ui-react'

const DropdownExampleSearchSelection = (options) => (
  <Dropdown
    placeholder='Select Country'
    fluid
    search
    selection
    options={options}
  />
)

export default DropdownExampleSearchSelection