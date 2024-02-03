# Run establish a cf tunnel


Sample: `test.yml`

```yml

name: Test

on: [push]

jobs:
  testsolaris:
    runs-on: macos-latest
    name: Test a cf tunnel
    steps:
    - uses: actions/checkout@v4
    - name: Run establish a cf tunnel
      id: test
      uses: vmactions/cf-tunnel@v0
      with:
        protocol: tcp
        port: 22



```









