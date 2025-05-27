import { defineStore } from 'pinia'

export const usePdfInfoStore = defineStore('pdfInfo', {
    state: () => ({
        currentPage: 1,
        pageCount: 0,
    })
})