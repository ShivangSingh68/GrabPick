import { Header } from "@/modules/home/components/header"
import { Metadata } from "next"
import { Footer } from "react-day-picker"


export const metadata: Metadata = {
    title: {
        template: "GrabPick",
        default: "Find your images with the help of AI"
    }
}

export default function HomeLayout({children}: {
    children: React.ReactNode
} ){
    return(
        <>
            <Header/>
            <main className="z-20 relative pt-0 w-full">
                {
                    children
                }
            </main>
            <Footer/>
        </>
    )
}